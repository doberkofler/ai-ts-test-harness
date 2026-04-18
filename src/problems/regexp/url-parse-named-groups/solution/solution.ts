const __legacySolution = (function urlParseNamedGroups(): RegExp {
		return /^(?<protocol>https?|ftp):\/\/(?<host>[A-Za-z0-9.-]+)(?::(?<port>\d+))?(?<path>\/[\w./-]*)?(?:\?(?<query>[^#\s]*))?(?:#(?<fragment>\S*))?$/;
	});
export const urlParseNamedGroups = __legacySolution;
