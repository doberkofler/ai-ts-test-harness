type Nullable<T> = {[K in keyof T]: T[K] | null};
type NonNullableFields<T> = {[K in keyof T]-?: NonNullable<T[K]>};

export function stripNulls<T extends object>(obj: Nullable<T>): NonNullableFields<T> {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null)) as NonNullableFields<T>;
}
