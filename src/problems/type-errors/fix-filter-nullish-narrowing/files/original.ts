export function compact(values: Array<string | null | undefined>): string[] {
	return values.filter(Boolean);
}
