export const parseFunctionNameFromSignature = (signature: string): string => {
	const match = /function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(signature);
	if (!match || typeof match[1] !== 'string') {
		throw new TypeError(`Unable to extract function name from signature: ${signature}`);
	}

	return match[1];
};
