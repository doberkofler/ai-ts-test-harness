# JSON XML CSV Conversion Notes

Important details tracked for this problem:

- Scalar coercion in `csvToJson` and `xmlToJson` uses these rules: `null` -> `null`, `true`/`false` -> booleans, numeric literals -> numbers, everything else -> strings.
- `jsonToCsv` emits RFC 4180-style CSV with CRLF (`\r\n`) line endings and escaped quotes (`""`).
- XML conversion stores values in child element text nodes, and column names are sanitized into valid XML element names.
- If two distinct column headers sanitize to the same XML element name, `jsonToXml` throws `TypeError`.
