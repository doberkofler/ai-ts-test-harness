# Word Wrapping in TypeScript

Notes tracked for this problem:

- In `soft` mode, wrapping only occurs at spaces or hyphens; if no such break exists within the available width, the token is kept intact (line may exceed width).
- When wrapping at a hyphen, the hyphen stays on the current line.
- `hangingIndent` is applied to every wrapped continuation line, and its length counts against the configured `width`.
- Existing input newlines are treated as hard paragraph breaks before wrapping, then output using `lineBreak`.
