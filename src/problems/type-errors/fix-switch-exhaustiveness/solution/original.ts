type Status = 'idle' | 'loading' | 'done';

export function statusLabel(status: Status): string {
	switch (status) {
		case 'idle':
			return 'Idle';
		case 'loading':
			return 'Loading...';
		default:
			return '';
	}
}
