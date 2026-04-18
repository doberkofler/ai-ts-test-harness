const isString = (value: string | null | undefined): value is string => typeof value === 'string';

export function compact(values: (string | null | undefined)[]): string[] {
	return values.filter(isString);
}
