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

type FormatMsOptions = {
	style?: 'compact' | 'timer';
};

const formatTimer = (durationMs: number): string => {
	const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		const parts = [`${hours}h`];
		if (minutes > 0) {
			parts.push(`${minutes}m`);
		}
		if (seconds > 0) {
			parts.push(`${seconds}s`);
		}
		return parts.join(' ');
	}

	if (minutes > 0) {
		return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
	}

	return `${seconds}s`;
};

export const formatMs = (durationMs: number, options: FormatMsOptions = {}): string => {
	if (options.style === 'timer') {
		return formatTimer(durationMs);
	}

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
