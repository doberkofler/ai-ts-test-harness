type ProblemLike = {
	name: string;
	category: string;
};

export const parseCategoryFilter = (value?: string): string[] | undefined => {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalizedValue = value.trim();
	if (normalizedValue.length === 0) {
		throw new TypeError(`Invalid --category value: ${value}`);
	}

	const categories = normalizedValue.split(',').map((category) => category.trim().toLowerCase());

	if (categories.some((category) => category.length === 0)) {
		throw new TypeError(`Invalid --category value: ${value}`);
	}

	return [...new Set(categories)];
};

export const selectProblemsByFilters = <T extends ProblemLike>(problems: T[], testName?: string, categories?: string[]): T[] => {
	let selected = problems;

	if (typeof testName === 'string') {
		const normalizedTestName = testName.trim();
		if (normalizedTestName.length === 0) {
			throw new TypeError(`Invalid --test value: ${testName}`);
		}

		const found = selected.find((problem) => problem.name === normalizedTestName);
		if (typeof found === 'undefined') {
			const availableNames = problems.map((problem) => problem.name).join(', ');
			throw new TypeError(`Unknown --test value: ${normalizedTestName}. Available tests: ${availableNames}`);
		}

		selected = [found];
	}

	if (Array.isArray(categories) && categories.length > 0) {
		const categorySet = new Set(categories);
		selected = selected.filter((problem) => categorySet.has(problem.category));

		if (selected.length === 0) {
			const availableCategories = [...new Set(problems.map((problem) => problem.category))].sort().join(', ');
			throw new TypeError(`No problems matched --category values: ${categories.join(', ')}. Available categories: ${availableCategories}`);
		}
	}

	return selected;
};

export const selectProblems = <T extends ProblemLike>(problems: T[], testName?: string): T[] => selectProblemsByFilters(problems, testName);
