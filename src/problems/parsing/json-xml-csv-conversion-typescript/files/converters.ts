export type Row = Record<string, string | number | boolean | null>;

export function jsonToCsv(rows: Row[]): string {
	void rows;
	throw new Error('Not implemented');
}

export function csvToJson(csv: string): Row[] {
	void csv;
	throw new Error('Not implemented');
}

export function jsonToXml(rows: Row[], rootElement: string, rowElement: string): string {
	void rows;
	void rootElement;
	void rowElement;
	throw new Error('Not implemented');
}

export function xmlToJson(xml: string, rowElement: string): Row[] {
	void xml;
	void rowElement;
	throw new Error('Not implemented');
}

export function csvToXml(csv: string, rootElement: string, rowElement: string): string {
	void csv;
	void rootElement;
	void rowElement;
	throw new Error('Not implemented');
}

export function xmlToCsv(xml: string, rowElement: string): string {
	void xml;
	void rowElement;
	throw new Error('Not implemented');
}
