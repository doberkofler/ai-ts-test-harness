type DeepPartial<T> = T extends object
	? {[K in keyof T]?: DeepPartial<T[K]>}
	: T;

type DeepReadonly<T> = T extends (infer U)[]
	? ReadonlyArray<DeepReadonly<U>>
	: T extends object
		? {readonly [K in keyof T]: DeepReadonly<T[K]>}
		: T;

export function mergeDeep<T extends object>(target: T, source: DeepPartial<T>): T {
	const result = {...target};
	for (const key in source) {
		const s = source[key];
		const t = target[key as keyof T];
		if (s && typeof s === 'object' && !Array.isArray(s)) {
			result[key as keyof T] = mergeDeep(t as object, s as object) as T[keyof T];
		} else if (s !== undefined) {
			result[key as keyof T] = s as T[keyof T];
		}
	}
	return result;
}
