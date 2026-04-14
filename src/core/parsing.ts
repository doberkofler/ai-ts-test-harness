type ParseIntOptionParams = {
	optionName: string;
	minimum: number;
};

export const parseIntOption = (value: string, params: ParseIntOptionParams): number => {
	const parsed = Number.parseInt(value, 10);
	if (!Number.isFinite(parsed) || parsed < params.minimum) {
		throw new TypeError(`Invalid ${params.optionName} value: ${value}`);
	}

	return parsed;
};

export const parseRequiredOption = (value: string, optionName: string): string => {
	if (value.length === 0) {
		throw new TypeError(`Invalid ${optionName} value: ${value}`);
	}

	return value;
};

export const parseOptionalNonEmptyOption = (value: string | undefined, optionName: string): string | undefined => {
	if (typeof value === 'string' && value.length === 0) {
		throw new TypeError(`Invalid ${optionName} value`);
	}

	return value;
};
