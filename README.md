### Maker

NxN pixel drawer. Drawing, copying, downloading, and viewing the board are public. Adding creations requires the board password.

Install dependencies with `bun install`, then run `bun --bun run dev` to use Bun's SQLite runtime.

Set `APP_PASSWORD` in `.env.local` to enable board login. Without it, the editor and board remain public, but adding creations stays locked. `DATABASE_PATH` optionally overrides the default `data/maker.sqlite` file.

The app serves its own `/login` page. The optional `bun run auth` proxy also allows public editor access; it uses `AUTH_PORT` (default `8841`) and `UPSTREAM_ORIGIN` (default `http://127.0.0.1:8840`). When using the proxy, set the same `APP_PASSWORD` for both processes.

Run board access tests with `bun test`.
