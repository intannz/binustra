import type {
  ApiErrorBody,
  ApiErrorCode,
  ApiResponse,
  FileAcceptType,
  PaginatedResponse,
  ValidationErrorDetail,
} from '../types/portal.types';

/* ========================================================================== */
/* Konfigurasi                                                                */
/* ========================================================================== */

const DEFAULT_BASE_URL = '/api/v1';
const TOKEN_KEY = 'token';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * Rapikan nilai VITE_API_BASE_URL:
 * - kosong: pakai /api/v1
 * - diawali slash (/api/v1): dipakai apa adanya
 * - host tanpa skema (xxx.up.railway.app): ditambah https://
 * - host tanpa path: ditambah /api/v1 sesuai api-spec
 */
export function resolveBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_BASE_URL;
  if (value.startsWith('/')) return value.replace(/\/+$/, '') || DEFAULT_BASE_URL;

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
  const url = (hasScheme ? value : `https://${value}`).replace(/\/+$/, '');

  try {
    return new URL(url).pathname === '/' ? `${url}${DEFAULT_BASE_URL}` : url;
  } catch {
    return url;
  }
}

/** Base URL tanpa slash di akhir */
export const API_BASE_URL = resolveBaseUrl(envBaseUrl);

/* ========================================================================== */
/* Token JWT                                                                  */
/* ========================================================================== */

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Storage tidak tersedia, token hanya berlaku sampai halaman dimuat ulang
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Abaikan
    }
  },
};

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Daftarkan fungsi yang dipanggil saat server membalas 401 (token tidak ada,
 * tidak valid, atau kedaluwarsa). Token sudah dihapus sebelum fungsi ini jalan.
 * Cocok dipakai AuthContext untuk membersihkan sesi lalu arahkan ke /login.
 * Request dengan opsi skipAuth (misalnya login) tidak memicu fungsi ini.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

/* ========================================================================== */
/* Error                                                                      */
/* ========================================================================== */

const DEFAULT_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  BAD_REQUEST: 'Permintaan tidak dapat dibaca oleh server.',
  UNAUTHORIZED: 'Sesi Anda sudah berakhir. Silakan masuk kembali.',
  FORBIDDEN: 'Anda tidak memiliki akses ke data ini.',
  NOT_FOUND: 'Data tidak ditemukan.',
  VALIDATION_ERROR: 'Data yang dikirim belum valid.',
  INTERNAL_ERROR: 'Terjadi kesalahan di server. Coba lagi beberapa saat lagi.',
  NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui.',
};

function defaultMessage(code: ApiErrorCode): string {
  return DEFAULT_MESSAGES[code] ?? DEFAULT_MESSAGES.UNKNOWN_ERROR ?? 'Terjadi kesalahan.';
}

function codeFromStatus(status: number): ApiErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 422:
      return 'VALIDATION_ERROR';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN_ERROR';
  }
}

/** Semua kegagalan request dilempar sebagai ApiError dengan bentuk seragam */
export class ApiError extends Error {
  /** Status HTTP, 0 bila request tidak sampai ke server */
  status: number;
  code: ApiErrorCode;
  details?: ValidationErrorDetail[];

  constructor(status: number, error: ApiErrorBody['error']) {
    super(error.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }

  /** Bentuk { error: { code, message, details } } yang sama dengan response server */
  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Ubah details VALIDATION_ERROR menjadi { namaField: pesan } untuk ditampilkan di form */
export function getFieldErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isApiError(error) || !error.details) return result;
  for (const detail of error.details) {
    if (!(detail.field in result)) result[detail.field] = detail.message;
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidationDetail(value: unknown): value is ValidationErrorDetail {
  return isRecord(value) && typeof value.field === 'string' && typeof value.message === 'string';
}

/** Ubah body error apa pun (JSON server, HTML proxy, kosong) menjadi ApiError */
function normalizeError(status: number, body: unknown): ApiError {
  const raw = isRecord(body) && isRecord(body.error) ? body.error : null;

  const code: ApiErrorCode =
    raw && typeof raw.code === 'string' && raw.code
      ? (raw.code as ApiErrorCode)
      : codeFromStatus(status);

  const message =
    raw && typeof raw.message === 'string' && raw.message ? raw.message : defaultMessage(code);

  const rawDetails = raw?.details;
  const details = Array.isArray(rawDetails) ? rawDetails.filter(isValidationDetail) : undefined;

  return new ApiError(status, { code, message, details });
}

/* ========================================================================== */
/* Request inti                                                               */
/* ========================================================================== */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';
type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  /** Query string. Nilai undefined, null, dan string kosong dilewati */
  params?: Record<string, QueryValue>;
  /** Untuk membatalkan request, misalnya di cleanup useEffect */
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Kirim request tanpa token dan tanpa penanganan 401 global (token tidak dihapus,
   * handler dari setUnauthorizedHandler tidak dipanggil). Dipakai untuk request login,
   * karena 401 di sana berarti kredensial salah, bukan sesi yang berakhir.
   */
  skipAuth?: boolean;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    query.append(key, String(value));
  }
  const queryString = query.toString();
  return queryString ? `${url}?${queryString}` : url;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204 || !contentType.includes('application/json')) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function execute(
  method: HttpMethod,
  path: string,
  options: RequestOptions & { body?: unknown } = {},
  accept: string = 'application/json',
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', accept);

  const token = options.skipAuth ? null : tokenStorage.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    // Content-Type multipart sengaja tidak diset, browser mengisinya beserta boundary
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body,
      signal: options.signal,
    });
  } catch (err) {
    // Request yang dibatalkan sengaja dilempar apa adanya agar pemanggil bisa mengabaikannya
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError(0, { code: 'NETWORK_ERROR', message: defaultMessage('NETWORK_ERROR') });
  }

  if (!response.ok) {
    const error = normalizeError(response.status, await readJson(response));
    if (response.status === 401 && !options.skipAuth) {
      tokenStorage.clear();
      unauthorizedHandler?.();
    }
    throw error;
  }

  return response;
}

async function readEnvelope<T>(response: Response): Promise<T> {
  const body = await readJson(response);
  if (!isRecord(body) || !('data' in body)) {
    throw new ApiError(response.status, {
      code: 'UNKNOWN_ERROR',
      message: 'Respons server tidak dapat dibaca.',
    });
  }
  return body as T;
}

async function requestData<T>(
  method: HttpMethod,
  path: string,
  options?: RequestOptions & { body?: unknown },
): Promise<T> {
  const response = await execute(method, path, options);
  const body = await readEnvelope<ApiResponse<T>>(response);
  return body.data;
}

/* ========================================================================== */
/* API publik                                                                 */
/* ========================================================================== */

export const api = {
  /** GET satu objek, mengembalikan isi `data` */
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return requestData<T>('GET', path, options);
  },

  /** GET list berpagination, mengembalikan { data, meta } */
  async getList<T>(path: string, options?: RequestOptions): Promise<PaginatedResponse<T>> {
    const response = await execute('GET', path, options);
    return readEnvelope<PaginatedResponse<T>>(response);
  },

  /** POST JSON, atau multipart bila body berupa FormData */
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return requestData<T>('POST', path, { ...options, body });
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return requestData<T>('PUT', path, { ...options, body });
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return requestData<T>('PATCH', path, { ...options, body });
  },

  /** Unduh file asli lewat header Accept (G-PKL-2 dan G-ABS-4) */
  async download(path: string, accept: FileAcceptType, options?: RequestOptions): Promise<Blob> {
    const response = await execute('GET', path, options, accept);
    return response.blob();
  },
};

/** Susun FormData untuk endpoint upload. Nilai undefined dan null dilewati */
export function toFormData(
  fields: Record<string, string | number | boolean | Blob | null | undefined>,
): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.append(key, value instanceof Blob ? value : String(value));
  }
  return form;
}

export default api;
