type Config = {
	host: string;
	port: number;
};

export function getConfig(): Config {
	return {host: 'localhost', port: 3000};
}
