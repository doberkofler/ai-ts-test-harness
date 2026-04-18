async function fetchUser(id: string): Promise<User> {
	try {
		const res = await fetch(`/api/users/${id}`);
		return await res.json();
	} catch (err) {
		throw new Error(`fetch failed: ${err}`);
	}
}

export {fetchUser};
