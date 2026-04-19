import axios from 'axios';

let baseURL = '';
const defaultHeaders = {};

export function configure(options) {
	baseURL = options.baseURL;
	if (options.headers) {
		Object.assign(defaultHeaders, options.headers);
	}
}

export async function get(path, params) {
	const response = await axios.get(baseURL + path, {
		params,
		headers: defaultHeaders,
	});
	return response.data;
}

export async function post(path, body, options) {
	const response = await axios.post(baseURL + path, body, {
		headers: {
			...defaultHeaders,
			...(options && options.headers),
		},
	});
	return response.data;
}

export function buildQueryString(params) {
	return Object.entries(params)
		.filter(([, v]) => v !== undefined && v !== null)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
}

export function parseResponse(raw) {
	if (raw && raw.data && Array.isArray(raw.data.items)) {
		return raw.data.items.map(item => ({
			id: item.id,
			label: item.name || item.title || 'Unknown',
			meta: item.meta || {},
		}));
	}
	return [];
}
