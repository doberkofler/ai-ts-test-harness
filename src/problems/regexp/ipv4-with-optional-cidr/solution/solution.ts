const __legacySolution = (function ipv4WithOptionalCidr(): RegExp {
		const octet = String.raw`(?:0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])`;
		const cidr = String.raw`(?:/(?:\d|[12]\d|3[0-2]))?`;
		return new RegExp(`^${octet}(?:\\.${octet}){3}${cidr}$`);
	});
export const ipv4WithOptionalCidr = __legacySolution;
