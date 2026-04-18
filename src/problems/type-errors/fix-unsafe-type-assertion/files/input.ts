export function upperUserId(payload: unknown): string {
	const user = payload as {id: string};
	return user.id.toUpperCase();
}
