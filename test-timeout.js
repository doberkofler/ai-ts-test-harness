import OpenAI from 'openai';
const client = new OpenAI({baseURL: 'http://localhost:11434/v1', apiKey: 'test'});
const start = Date.now();
try {
	const stream = await client.chat.completions.create(
		{
			model: 'gemma4:31b',
			messages: [{role: 'user', content: 'hello'}],
			stream: true,
		},
		{timeout: 100},
	);
	for await (const chunk of stream) {
	}
} catch (e) {
	console.log('Caught:', e.name, e.message);
	console.log('Time:', Date.now() - start);
}
