declare module 'express' {
	interface Request {
		user?: {id: string; roles: string[]};
	}
}

export function requireRole(role: string) {
	return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
		if (!req.user?.roles.includes(role)) {
			res.status(403).json({error: 'Forbidden'});
			return;
		}
		next();
	};
}
