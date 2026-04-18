const __legacySolution = (function iso8601DatetimeNamedCapture(): RegExp {
		return /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\d|3[01])T(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d):(?<second>[0-5]\d)(?<offset>Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
	});
export const iso8601DatetimeNamedCapture = __legacySolution;
