# bunnip

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To run the app and PostgreSQL in Docker:

```bash
docker compose up -d --build
```

The app serves HTTP at `http://localhost:3005` and enables `/info`.
It connects to PostgreSQL through `postgres:5432` inside Docker.
For database access from your computer, use
`postgresql://network:network@localhost:15432/network`.
Compose supplies the app settings directly; it does not load the app's `.env` file.

To also serve HTTPS, place your certificate at `certs/public.pem` and
your private key at `certs/private.pem`, then run:

```bash
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
```

HTTPS is available at `https://localhost:3443`. Certificates are mounted read-only
and excluded from the image.

PostgreSQL runs `postgres.sql` only when its data volume is first initialized.
To recreate the demo database after changing the SQL (deletes stored data):

```bash
docker compose down -v
docker compose up -d --build
```
