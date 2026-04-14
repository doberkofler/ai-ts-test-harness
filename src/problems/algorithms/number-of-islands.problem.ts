import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'number-of-islands',
	description: "Given a grid of '1' (land) and '0' (water), return the number of islands using BFS/DFS flood-fill.",
	signature: 'function numberOfIslands(grid: string[][]): number',
	solution: function numberOfIslands(grid: string[][]): number {
		if (grid.length === 0) {
			return 0;
		}

		const rows = grid.length;
		const [firstRow] = grid;
		if (!firstRow) {
			return 0;
		}
		const cols = firstRow.length;
		const seen: boolean[][] = Array.from({length: rows}, () => Array.from({length: cols}, () => false));

		const inBounds = (row: number, col: number): boolean => row >= 0 && row < rows && col >= 0 && col < cols;

		const flood = (startRow: number, startCol: number): void => {
			const stack: [number, number][] = [[startRow, startCol]];
			while (stack.length > 0) {
				const current = stack.pop();
				if (!current) {
					continue;
				}
				const [row, col] = current;
				if (!inBounds(row, col)) {
					continue;
				}

				const seenRow = seen[row];
				const gridRow = grid[row];
				if (!seenRow || !gridRow) {
					continue;
				}

				if (seenRow[col] === true || gridRow[col] !== '1') {
					continue;
				}

				seenRow[col] = true;
				stack.push([row + 1, col], [row - 1, col], [row, col + 1], [row, col - 1]);
			}
		};

		let islands = 0;
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const gridRow = grid[row];
				const seenRow = seen[row];
				if (!gridRow || !seenRow) {
					continue;
				}

				if (gridRow[col] !== '1' || seenRow[col] === true) {
					continue;
				}

				islands += 1;
				flood(row, col);
			}
		}

		return islands;
	},
	tests: ({assert, implementation}) => {
		assert.strictEqual(
			implementation([
				['1', '1', '0', '0', '0'],
				['1', '1', '0', '0', '0'],
				['0', '0', '1', '0', '0'],
				['0', '0', '0', '1', '1'],
			]),
			3,
		);
		assert.strictEqual(
			implementation([
				['1', '1', '1'],
				['0', '1', '0'],
				['1', '1', '1'],
			]),
			1,
		);
		assert.strictEqual(implementation([]), 0);
	},
});
