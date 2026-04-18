const __legacySolution = (function strongPasswordLookahead(): RegExp {
		return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
	});
export const strongPasswordLookahead = __legacySolution;
