export const formatClockTime = (date: Date): string => {
	const hour = String(date.getHours()).padStart(2, '0');
	const minute = String(date.getMinutes()).padStart(2, '0');
	const second = String(date.getSeconds()).padStart(2, '0');
	return `${hour}:${minute}:${second}`;
};

export const formatElapsedClock = (durationMs: number): string => {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const hour = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
	const minute = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
	const second = String(totalSeconds % 60).padStart(2, '0');
	return `${hour}:${minute}:${second}`;
};

export const formatMs = (durationMs: number): string => {
	if (durationMs < 1000) {
		return `${durationMs}ms`;
	}

	if (durationMs < 60_000) {
		return `${Math.round(durationMs / 1000)}s`;
	}

	if (durationMs < 3_600_000) {
		return `${Math.round(durationMs / 60_000)}m`;
	}

	return `${Math.round(durationMs / 3_600_000)}h`;
};

export const formatIsoToLocal = (iso: string): string => {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) {
		return iso;
	}

	return parsed.toLocaleString();
};
