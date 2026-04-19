import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {describe, it} from 'vitest';

type Row = Record<string, string | number | boolean | null>;

type ConvertersApi = {
	jsonToCsv: (rows: Row[]) => string;
	csvToJson: (csv: string) => Row[];
	jsonToXml: (rows: Row[], rootElement: string, rowElement: string) => string;
	xmlToJson: (xml: string, rowElement: string) => Row[];
	csvToXml: (csv: string, rootElement: string, rowElement: string) => string;
	xmlToCsv: (xml: string, rowElement: string) => string;
};

const SAMPLE_ROWS: Row[] = [
	{id: 1, name: 'Alice, PhD', active: true, score: null},
	{id: 2, name: 'Bob "the" Builder', active: false, score: 98.5},
];

const SAMPLE_CSV = 'id,name,active,score\r\n1,"Alice, PhD",true,null\r\n2,"Bob ""the"" Builder",false,98.5';
const SAMPLE_XML =
	'<dataset><row><id>1</id><name>Alice, PhD</name><active>true</active><score>null</score></row><row><id>2</id><name>Bob &quot;the&quot; Builder</name><active>false</active><score>98.5</score></row></dataset>';

const loadImplementation = async (): Promise<ConvertersApi> => {
	const candidates = ['./converters.ts', '../converters.ts', '../solution/converters.ts', '../files/converters.ts'];
	let moduleUrl: URL | undefined;

	for (const candidate of candidates) {
		const url = new URL(candidate, import.meta.url);
		if (existsSync(url)) {
			moduleUrl = url;
			break;
		}
	}

	if (typeof moduleUrl === 'undefined') {
		throw new TypeError(`Unable to resolve implementation from: ${candidates.join(', ')}`);
	}

	const moduleNamespace: unknown = await import(moduleUrl.href);
	if (typeof moduleNamespace !== 'object' || moduleNamespace === null) {
		throw new TypeError('Expected imported module namespace object');
	}

	const candidate = moduleNamespace as Record<string, unknown>;
	const api: Partial<ConvertersApi> = {
		jsonToCsv: candidate.jsonToCsv as ConvertersApi['jsonToCsv'],
		csvToJson: candidate.csvToJson as ConvertersApi['csvToJson'],
		jsonToXml: candidate.jsonToXml as ConvertersApi['jsonToXml'],
		xmlToJson: candidate.xmlToJson as ConvertersApi['xmlToJson'],
		csvToXml: candidate.csvToXml as ConvertersApi['csvToXml'],
		xmlToCsv: candidate.xmlToCsv as ConvertersApi['xmlToCsv'],
	};

	for (const [name, value] of Object.entries(api)) {
		if (typeof value !== 'function') {
			throw new TypeError(`Expected export ${name} to be a function`);
		}
	}

	return api as ConvertersApi;
};

describe('JSON <-> XML <-> CSV converters', () => {
	it('converts JSON to RFC 4180 CSV', async () => {
		const {jsonToCsv} = await loadImplementation();
		assert.strictEqual(jsonToCsv(SAMPLE_ROWS), SAMPLE_CSV);
	});

	it('converts CSV back to JSON with scalar coercion', async () => {
		const {csvToJson} = await loadImplementation();
		assert.deepStrictEqual(csvToJson(SAMPLE_CSV), SAMPLE_ROWS);
	});

	it('converts JSON to XML and XML to JSON', async () => {
		const {jsonToXml, xmlToJson} = await loadImplementation();
		assert.strictEqual(jsonToXml(SAMPLE_ROWS, 'dataset', 'row'), SAMPLE_XML);
		assert.deepStrictEqual(xmlToJson(SAMPLE_XML, 'row'), SAMPLE_ROWS);
	});

	it('converts CSV to XML and XML to CSV', async () => {
		const {csvToXml, xmlToCsv} = await loadImplementation();
		assert.strictEqual(csvToXml(SAMPLE_CSV, 'dataset', 'row'), SAMPLE_XML);
		assert.strictEqual(xmlToCsv(SAMPLE_XML, 'row'), SAMPLE_CSV);
	});

	it('sanitizes invalid XML field names derived from headers', async () => {
		const {jsonToXml} = await loadImplementation();
		const xml = jsonToXml([{'first name': 'Alice', '2score': 10, 'x/y': 'ok'}], 'root', 'row');
		assert.strictEqual(xml, '<root><row><first_name>Alice</first_name><_2score>10</_2score><x_y>ok</x_y></row></root>');
	});

	it('throws TypeError on invalid CSV and malformed XML', async () => {
		const {csvToJson, xmlToJson} = await loadImplementation();
		assert.throws(() => csvToJson('id,name\n1,Alice'), (error: unknown) => error instanceof TypeError);
		assert.throws(() => csvToJson('id,name\r\n1,"Alice'), (error: unknown) => error instanceof TypeError);
		assert.throws(() => xmlToJson('<root><row><id>1</id></root>', 'row'), (error: unknown) => error instanceof TypeError);
	});
});
