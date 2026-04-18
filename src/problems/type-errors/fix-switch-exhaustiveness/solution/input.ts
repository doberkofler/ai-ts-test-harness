type Status = 'idle' | 'loading' | 'done';

const assertNever = (value: never): never => {
	throw new Error(`Unexpected status: ${String(value)}`);
};

export function statusLabel(status: Status): string {
	switch (status) {
		case 'idle':
			return 'Idle';
		case 'loading':
			return 'Loading...';
		case 'done':
			return 'Done';
		default:
			return assertNever(status);
	}
}
