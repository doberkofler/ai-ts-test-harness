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
