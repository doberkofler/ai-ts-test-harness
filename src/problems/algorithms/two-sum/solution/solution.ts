const __legacySolution = (function twoSum(nums: number[], target: number): [number, number] | null {
		const seen = new Map<number, number>();

		for (let index = 0; index < nums.length; index += 1) {
			const value = nums.at(index);
			if (typeof value !== 'number') {
				continue;
			}

			const needed = target - value;
			const matchIndex = seen.get(needed);
			if (typeof matchIndex === 'number') {
				return [matchIndex, index];
			}

			seen.set(value, index);
		}

		return null;
	});
export const twoSum = __legacySolution;
