/** Route halaman login di aplikasi */
export const LOGIN_ROUTE = '/login';

export interface SeederAccount {
  id: string;
  username: string;
  nomorInduk: string;
  nama: string;
  role: 'siswa' | 'guru';
  password: string;
  token: string;
}

/**
 * Akun dan JWT token statis dari seeder backend (namnammn/pkm-backend)
 * karena backend tidak memiliki endpoint POST /auth/login.
 */
export const SEEDER_ACCOUNTS: readonly SeederAccount[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'siswa1',
    nomorInduk: '2324001',
    nama: 'Ahmad Fauzi',
    role: 'siswa',
    password: 'password123',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJyb2xlIjoic2lzd2EiLCJpYXQiOjE3OTU1MDAyNzQsImV4cCI6MTc5ODA5MjI3NH0.AEQr0GXsA6uBfuxdenCsnqGVMgcLrJ9fDnUIIL4XXrg',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'siswa2',
    nomorInduk: '2324002',
    nama: 'Dewi Lestari',
    role: 'siswa',
    password: 'password123',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyMjIyMjIyMi0yMjIyLTIyMjItMjIyMi0yMjIyMjIyMjIyMjIiLCJyb2xlIjoic2lzd2EiLCJpYXQiOjE3OTU1MDAyNzQsImV4cCI6MTc5ODA5MjI3NH0.y06cCKC1Kk9uVm5P1Dba4s9ZN1BuEboCUbPC4BbOZPY',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'guru1',
    nomorInduk: '198001012005012001',
    nama: 'Siti Rahma, S.Pd',
    role: 'guru',
    password: 'password123',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMzMzMzMzMy0zMzMzLTMzMzMtMzMzMy0zMzMzMzMzMzMzMzMiLCJyb2xlIjoiZ3VydSIsImlhdCI6MTc5NTUwMDI3NCwiZXhwIjoxNzk4MDkyMjc0fQ.ySRDJK1kuplJ00a_WvsbCsv4SLTgJ-iT6C-zjutfiRw',
  },
];