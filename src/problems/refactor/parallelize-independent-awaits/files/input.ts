const loadA = async (): Promise<number> => 4;
const loadB = async (): Promise<number> => 6;

export async function loadBoth(): Promise<number> {
	const a = await loadA();
	const b = await loadB();
	return a + b;
}
