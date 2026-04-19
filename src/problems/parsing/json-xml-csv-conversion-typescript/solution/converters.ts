export type Row = Record<string, string | number | boolean | null>;

type Scalar = string | number | boolean | null;

type XmlNode = {
	readonly name: string;
	readonly children: XmlNode[];
	readonly textParts: string[];
};

const XML_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
const NUMBER_LITERAL_REGEX = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

const assertNonEmptyString = (value: unknown, name: string): string => {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new TypeError(`${name} must be a non-empty string`);
	}

	return value;
};

const assertXmlElementName = (value: string, name: string): string => {
	if (!XML_NAME_REGEX.test(value) || /^xml/i.test(value)) {
		throw new TypeError(`${name} must be a valid XML element name`);
	}

	return value;
};

const assertRows = (rows: unknown): Row[] => {
	if (!Array.isArray(rows)) {
		throw new TypeError('rows must be an array');
	}

	for (const [index, row] of rows.entries()) {
		if (typeof row !== 'object' || row === null || Array.isArray(row)) {
			throw new TypeError(`rows[${index}] must be an object`);
		}

		for (const [key, value] of Object.entries(row)) {
			if (typeof key !== 'string' || key.length === 0) {
				throw new TypeError(`rows[${index}] has invalid key`);
			}

			if (
				typeof value !== 'string' &&
				typeof value !== 'number' &&
				typeof value !== 'boolean' &&
				value !== null
			) {
				throw new TypeError(`rows[${index}].${key} must be string, number, boolean, or null`);
			}

			if (typeof value === 'number' && !Number.isFinite(value)) {
				throw new TypeError(`rows[${index}].${key} must be a finite number`);
			}
		}
	}

	return rows;
};

const sanitizeXmlName = (header: string): string => {
	if (header.length === 0) {
		return '_';
	}

	let result = '';
	for (let index = 0; index < header.length; index += 1) {
		const character = header[index];
		const isValid = /[A-Za-z0-9_.-]/.test(character);
		if (!isValid) {
			result += '_';
			continue;
		}

		result += character;
	}

	if (!/^[A-Za-z_]/.test(result)) {
		result = `_${result}`;
	}

	if (/^xml/i.test(result)) {
		result = `_${result}`;
	}

	if (!XML_NAME_REGEX.test(result)) {
		return '_';
	}

	return result;
};

const escapeCsvField = (value: string): string => {
	if (!/[",\r\n]/.test(value)) {
		return value;
	}

	return `"${value.replaceAll('"', '""')}"`;
};

const formatScalar = (value: Scalar): string => {
	if (value === null) {
		return 'null';
	}

	if (typeof value === 'boolean') {
		return value ? 'true' : 'false';
	}

	return String(value);
};

const parseScalar = (value: string): Scalar => {
	if (value === 'null') {
		return null;
	}

	if (value === 'true') {
		return true;
	}

	if (value === 'false') {
		return false;
	}

	if (NUMBER_LITERAL_REGEX.test(value)) {
		return Number(value);
	}

	return value;
};

const parseCsvRecords = (csv: string): string[][] => {
	const records: string[][] = [];
	let currentRecord: string[] = [];
	let currentField = '';
	let inQuotes = false;
	let index = 0;

	while (index < csv.length) {
		const character = csv[index];

		if (inQuotes) {
			if (character === '"') {
				if (csv[index + 1] === '"') {
					currentField += '"';
					index += 2;
					continue;
				}

				inQuotes = false;
				index += 1;
				continue;
			}

			currentField += character;
			index += 1;
			continue;
		}

		if (character === '"') {
			if (currentField.length !== 0) {
				throw new TypeError('Invalid CSV: unexpected quote inside unquoted field');
			}

			inQuotes = true;
			index += 1;
			continue;
		}

		if (character === ',') {
			currentRecord.push(currentField);
			currentField = '';
			index += 1;
			continue;
		}

		if (character === '\r') {
			if (csv[index + 1] !== '\n') {
				throw new TypeError('Invalid CSV: expected LF after CR (RFC 4180 CRLF line ending)');
			}

			currentRecord.push(currentField);
			records.push(currentRecord);
			currentRecord = [];
			currentField = '';
			index += 2;
			continue;
		}

		if (character === '\n') {
			throw new TypeError('Invalid CSV: expected CRLF line endings');
		}

		currentField += character;
		index += 1;
	}

	if (inQuotes) {
		throw new TypeError('Invalid CSV: unclosed quoted field');
	}

	if (csv.length > 0) {
		currentRecord.push(currentField);
		records.push(currentRecord);
	}

	return records;
};

const decodeXmlEntities = (value: string): string =>
	value.replaceAll(/&(amp|lt|gt|quot|apos);/g, (full, entity: string) => {
		switch (entity) {
			case 'amp':
				return '&';
			case 'lt':
				return '<';
			case 'gt':
				return '>';
			case 'quot':
				return '"';
			case 'apos':
				return "'";
			default:
				return full;
		}
	});

const escapeXmlText = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const parseXml = (xml: string): XmlNode => {
	if (typeof xml !== 'string') {
		throw new TypeError('xml must be a string');
	}

	const trimmed = xml.trim();
	if (trimmed.length === 0) {
		throw new TypeError('xml must be a non-empty string');
	}

	const withoutDeclaration = trimmed.replace(/^<\?xml[^?]*\?>\s*/i, '');
	const tokens = withoutDeclaration.match(/<[^>]+>|[^<]+/g);
	if (!tokens) {
		throw new TypeError('Invalid XML: cannot tokenize input');
	}

	const stack: XmlNode[] = [];
	let root: XmlNode | undefined;

	for (const token of tokens) {
		if (!token.startsWith('<')) {
			if (stack.length === 0) {
				if (token.trim().length > 0) {
					throw new TypeError('Invalid XML: text outside root element');
				}
				continue;
			}

			stack[stack.length - 1].textParts.push(decodeXmlEntities(token));
			continue;
		}

		if (/^<\/.+>$/.test(token)) {
			const endName = token.slice(2, -1).trim();
			if (!XML_NAME_REGEX.test(endName)) {
				throw new TypeError(`Invalid XML: malformed end tag ${token}`);
			}

			const current = stack.pop();
			if (!current || current.name !== endName) {
				throw new TypeError(`Invalid XML: mismatched closing tag ${token}`);
			}

			if (stack.length > 0) {
				stack[stack.length - 1].children.push(current);
			} else if (typeof root === 'undefined') {
				root = current;
			} else {
				throw new TypeError('Invalid XML: multiple root elements');
			}

			continue;
		}

		if (/^<.+\/>$/.test(token)) {
			const name = token.slice(1, -2).trim();
			if (!XML_NAME_REGEX.test(name) || /^xml/i.test(name)) {
				throw new TypeError(`Invalid XML: malformed self-closing tag ${token}`);
			}

			const node: XmlNode = {name, children: [], textParts: []};
			if (stack.length > 0) {
				stack[stack.length - 1].children.push(node);
			} else if (typeof root === 'undefined') {
				root = node;
			} else {
				throw new TypeError('Invalid XML: multiple root elements');
			}

			continue;
		}

		const startName = token.slice(1, -1).trim();
		if (!XML_NAME_REGEX.test(startName) || /^xml/i.test(startName)) {
			throw new TypeError(`Invalid XML: malformed start tag ${token}`);
		}

		stack.push({name: startName, children: [], textParts: []});
	}

	if (stack.length > 0) {
		throw new TypeError('Invalid XML: unclosed tags');
	}

	if (typeof root === 'undefined') {
		throw new TypeError('Invalid XML: missing root element');
	}

	return root;
};

const collectHeaders = (rows: readonly Row[]): string[] => {
	const headers: string[] = [];
	const seen = new Set<string>();

	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!seen.has(key)) {
				seen.add(key);
				headers.push(key);
			}
		}
	}

	return headers;
};

export function jsonToCsv(rows: Row[]): string {
	const validatedRows = assertRows(rows);
	if (validatedRows.length === 0) {
		return '';
	}

	const headers = collectHeaders(validatedRows);
	if (headers.length === 0) {
		return '';
	}

	const headerLine = headers.map(escapeCsvField).join(',');
	const dataLines = validatedRows.map((row) =>
		headers
			.map((header) => {
				const value = row[header];
				if (typeof value === 'undefined') {
					return '';
				}

				return escapeCsvField(formatScalar(value));
			})
			.join(','),
	);

	return [headerLine, ...dataLines].join('\r\n');
}

export function csvToJson(csv: string): Row[] {
	if (typeof csv !== 'string') {
		throw new TypeError('csv must be a string');
	}

	if (csv.length === 0) {
		return [];
	}

	const records = parseCsvRecords(csv);
	if (records.length === 0) {
		return [];
	}

	const [headers, ...dataRecords] = records;
	if (headers.length === 0 || headers.some((header) => header.length === 0)) {
		throw new TypeError('Invalid CSV: header row must contain non-empty column names');
	}

	const duplicates = new Set<string>();
	const seenHeaders = new Set<string>();
	for (const header of headers) {
		if (seenHeaders.has(header)) {
			duplicates.add(header);
		}
		seenHeaders.add(header);
	}

	if (duplicates.size > 0) {
		throw new TypeError(`Invalid CSV: duplicate header(s): ${[...duplicates].join(', ')}`);
	}

	return dataRecords.map((record, rowIndex) => {
		if (record.length !== headers.length) {
			throw new TypeError(
				`Invalid CSV: row ${rowIndex + 2} has ${record.length} fields; expected ${headers.length}`,
			);
		}

		const row: Row = {};
		for (let index = 0; index < headers.length; index += 1) {
			row[headers[index]] = parseScalar(record[index]);
		}

		return row;
	});
}

export function jsonToXml(rows: Row[], rootElement: string, rowElement: string): string {
	const validatedRows = assertRows(rows);
	const rootName = assertXmlElementName(assertNonEmptyString(rootElement, 'rootElement'), 'rootElement');
	const rowName = assertXmlElementName(assertNonEmptyString(rowElement, 'rowElement'), 'rowElement');
	const headers = collectHeaders(validatedRows);

	const sanitizedMap = new Map<string, string>();
	const usedNames = new Set<string>();
	for (const header of headers) {
		const sanitized = sanitizeXmlName(header);
		if (usedNames.has(sanitized)) {
			throw new TypeError(`Column name collision after XML sanitization: ${header} -> ${sanitized}`);
		}

		usedNames.add(sanitized);
		sanitizedMap.set(header, sanitized);
	}

	const rowXml = validatedRows
		.map((row) => {
			const fields = headers
				.map((header) => {
					const element = sanitizedMap.get(header);
					if (typeof element === 'undefined') {
						throw new TypeError(`Missing XML mapping for column: ${header}`);
					}

					const value = row[header];
					const text = typeof value === 'undefined' ? '' : escapeXmlText(formatScalar(value));
					return `<${element}>${text}</${element}>`;
				})
				.join('');

			return `<${rowName}>${fields}</${rowName}>`;
		})
		.join('');

	return `<${rootName}>${rowXml}</${rootName}>`;
}

export function xmlToJson(xml: string, rowElement: string): Row[] {
	const rowName = assertXmlElementName(assertNonEmptyString(rowElement, 'rowElement'), 'rowElement');
	const root = parseXml(xml);

	const rows = root.children.filter((child) => child.name === rowName);
	if (rows.length === 0) {
		return [];
	}

	return rows.map((rowNode) => {
		if (rowNode.textParts.join('').trim().length > 0) {
			throw new TypeError(`Invalid XML: row element <${rowName}> must not contain direct text`);
		}

		const row: Row = {};
		for (const fieldNode of rowNode.children) {
			if (fieldNode.children.length > 0) {
				throw new TypeError(`Invalid XML: field <${fieldNode.name}> must contain text only`);
			}

			if (Object.hasOwn(row, fieldNode.name)) {
				throw new TypeError(`Invalid XML: duplicate field <${fieldNode.name}> in row`);
			}

			row[fieldNode.name] = parseScalar(fieldNode.textParts.join(''));
		}

		return row;
	});
}

export function csvToXml(csv: string, rootElement: string, rowElement: string): string {
	return jsonToXml(csvToJson(csv), rootElement, rowElement);
}

export function xmlToCsv(xml: string, rowElement: string): string {
	return jsonToCsv(xmlToJson(xml, rowElement));
}
