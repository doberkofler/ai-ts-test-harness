# Minified JavaScript to Readable JavaScript

Notes tracked for this problem:

- The source uses a UMD wrapper. The transformed result must keep CommonJS, AMD, and global fallback behavior.
- Public API methods (`on`, `once`, `emit`, `off`, `clear`) should receive JSDoc comments.
- `once` removal through `off(event, originalListener)` relies on the `_fn` back-reference and must be preserved.
- This is a readability refactor only: no runtime behavior changes are allowed.
