function fetchUser(id: string): Promise<User> {
	return fetch(`/api/users/${id}`)
		.then(res => res.json())
		.catch(err => { throw new Error(`fetch failed: ${err}`); });
}

export {fetchUser};
