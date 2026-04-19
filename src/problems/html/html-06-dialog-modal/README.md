# html-06-dialog-modal

This problem has several behavioral requirements that cannot be proven by static HTML alone.

The repository tracks these implementation assumptions so tests remain practical and deterministic:

- Focus trap is validated by checking for Tab-key handling, a first/last focusable element strategy, and calls to `focus()`.
- Backdrop click close is validated via a click handler that checks the event target is the `<dialog>` element itself.
- Open/close wiring is expected to use native `HTMLDialogElement` methods (`showModal()` and `close()`).

If you prefer a different focus-management strategy, update `tests/problem.test.ts` and `solution/solution.ts` together.
