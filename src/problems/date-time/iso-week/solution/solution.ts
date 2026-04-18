const __legacySolution = (function getISOWeek(date: Date): {week: number; year: number} {
		// Clone to avoid mutation; normalize to UTC midnight
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

		// ISO weekday: Mon=1 … Sun=7
		const dow = d.getUTCDay() || 7;

		// Shift to nearest Thursday (ISO week anchor)
		d.setUTCDate(d.getUTCDate() + 4 - dow);

		const year = d.getUTCFullYear();

		// Ordinal of the Thursday within its year
		const yearStart = Date.UTC(year, 0, 1);
		const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);

		return {week, year};
	});
export const getISOWeek = __legacySolution;
