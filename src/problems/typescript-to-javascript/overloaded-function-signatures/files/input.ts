export function format(value: number): string;
export function format(value: Date): string;
export function format(value: number[]): string[];
export function format(value: number | Date | number[]): string | string[] {
	if (Array.isArray(value)) {
		return value.map((n) => n.toFixed(2));
	}
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}
	return value.toFixed(2);
}
