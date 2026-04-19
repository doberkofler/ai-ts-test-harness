# TS-JS-09 module augmentation notes

Additional behavior to track for this problem:

- `declare module 'express'` is TypeScript-only and must not appear in ES2022 output.
- Middleware should remain framework-compatible without importing `express` at runtime.
- Access checks still rely on `req.user?.roles.includes(role)` and return HTTP 403 with `{error: 'Forbidden'}` when unauthorized.
