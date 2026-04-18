export function getProp<T, K extends keyof T>(value: T, key: K): T[K] {
	return value[key];
}
