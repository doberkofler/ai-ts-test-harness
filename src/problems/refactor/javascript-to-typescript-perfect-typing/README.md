# JavaScript to TypeScript with Perfect Typing

Notes tracked for this problem:

- `get` and `post` must stay generic (`get<T>`, `post<T>`) and return `Promise<T>`.
- `parseResponse` must take `unknown` input and narrow through explicit type guards.
- `buildQueryString` accepts only `string | number | boolean` values (keyed by string).
- Forbidden in the transformed file: `any`, non-null assertions (`!`), and type casts (`as`, angle-bracket casts).
- Runtime behaviour must remain compatible with the legacy JavaScript module (header merge semantics and response mapping defaults).
