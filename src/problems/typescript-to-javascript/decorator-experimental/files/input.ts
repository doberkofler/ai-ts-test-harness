function log(target: object, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
	const original = descriptor.value as (...args: unknown[]) => unknown;
	descriptor.value = function (...args: unknown[]) {
		console.log(`[${key}] called with`, args);
		const result = original.apply(this, args);
		console.log(`[${key}] returned`, result);
		return result;
	};
	return descriptor;
}

class Calculator {
	@log
	add(a: number, b: number): number {
		return a + b;
	}
}
