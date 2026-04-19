# TS-JS-03 decorator conversion notes

Additional behavior to track for this problem:

- Target output is ES2022 JavaScript, so TypeScript decorator syntax (`@log`) must be removed.
- The conversion should preserve equivalent runtime behavior by wrapping `Calculator.prototype.add` with logging logic.
- Log output must still include both call arguments and return value using the same message format (`[add] called with`, `[add] returned`).
