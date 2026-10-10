# Security Policy

## Supported versions

Security fixes are applied to the latest release only.

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions or pull requests.

Report them privately through GitHub: open the [Security tab](https://github.com/chamals3n4/OpenATS/security), choose "Report a vulnerability", and describe the issue with steps to reproduce.

We aim to respond within a week. Fixed vulnerabilities are disclosed in the release notes.

## How credentials are stored

OpenATS manages its own sign-in with [Better Auth](https://www.better-auth.com), running in the Next.js server.

- **Passwords** are never stored in plain text. Only a salted scrypt hash is kept, in the `password` column of the `auth_accounts` table.
- **Sessions** are rows in `auth_sessions`, referenced by an `HttpOnly` cookie that is marked `Secure` in production. They last 7 days.
- **API tokens** are short-lived (15 minute) JWTs signed with an Ed25519 key. The key pair is in `auth_jwks`, with the private key encrypted using `BETTER_AUTH_SECRET`.
- **`BETTER_AUTH_SECRET`** signs cookies and encrypts that key, so treat it like a password: at least 32 random characters, never committed, and rotating it signs everyone out.

The Express API only verifies tokens. It never reads or returns rows from the `auth_*` tables.
