type User = {
	name: string;
	age: number;
};

export function createUser(): User {
	return {name: 'Alice', age: 30};
}
