const __legacySolution = (function validateDate(s: string): boolean {
		// Strict format: exactly YYYY-MM-DD, digits only in each segment
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
		if (match === null) {
			return false;
		}

		const year = Number.parseInt(match[1] as string, 10);
		const month = Number.parseInt(match[2] as string, 10);
		const day = Number.parseInt(match[3] as string, 10);

		if (month < 1 || month > 12) {
			return false;
		}

		const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

		const daysInMonth = [
			0, // index 0 unused
			31, // Jan
			isLeap ? 29 : 28, // Feb
			31, // Mar
			30, // Apr
			31, // May
			30, // Jun
			31, // Jul
			31, // Aug
			30, // Sep
			31, // Oct
			30, // Nov
			31, // Dec
		] as const;

		// @ts-expect-error: TS2532
		return day >= 1 && day <= daysInMonth[month];
	});
export const validateDate = __legacySolution;
