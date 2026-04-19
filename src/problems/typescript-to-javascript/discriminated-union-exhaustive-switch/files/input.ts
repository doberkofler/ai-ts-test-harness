type Shape =
	| {kind: 'circle'; radius: number}
	| {kind: 'rectangle'; width: number; height: number}
	| {kind: 'triangle'; base: number; height: number};

export function area(shape: Shape): number {
	switch (shape.kind) {
		case 'circle':
			return Math.PI * shape.radius ** 2;
		case 'rectangle':
			return shape.width * shape.height;
		case 'triangle':
			return 0.5 * shape.base * shape.height;
		default: {
			const _exhaustive: never = shape;
			throw new Error(`Unhandled shape: ${JSON.stringify(_exhaustive)}`);
		}
	}
}
