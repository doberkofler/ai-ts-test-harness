const __legacySolution = (function productOfArrayExceptSelf(values: number[]): number[] {
		const result = Array.from({length: values.length}, () => 1);
		let prefix = 1;
		for (let index = 0; index < values.length; index += 1) {
			result[index] = prefix;
			prefix *= values.at(index) ?? 1;
		}

		let suffix = 1;
		for (let index = values.length - 1; index >= 0; index -= 1) {
			const currentResult = result.at(index);
			if (typeof currentResult === 'number') {
				result[index] = currentResult * suffix;
			}

			suffix *= values.at(index) ?? 1;
		}

		return result.map((value) => (Object.is(value, -0) ? 0 : value));
	});
export const productOfArrayExceptSelf = __legacySolution;
