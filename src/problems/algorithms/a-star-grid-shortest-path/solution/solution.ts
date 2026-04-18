type Coord = readonly [row: number, col: number];

const __legacySolution = (function aStarGridShortestPath(grid: number[][], start: Coord, end: Coord): number | null {
		const rows = grid.length;
		const [firstRow] = grid;
		if (!firstRow) {
			return null;
		}
		const cols = firstRow.length;
		if (rows === 0 || cols === 0) {
			return null;
		}

		const [startRow, startCol] = start;
		const [endRow, endCol] = end;

		const inBounds = (row: number, col: number): boolean => row >= 0 && row < rows && col >= 0 && col < cols;
		const cellAt = (row: number, col: number): number | null => {
			const rowValues = grid[row];
			if (!rowValues) {
				return null;
			}
			const cell = rowValues[col];
			return typeof cell === 'number' ? cell : null;
		};

		if (!inBounds(startRow, startCol) || !inBounds(endRow, endCol)) {
			return null;
		}
		if (cellAt(startRow, startCol) !== 0 || cellAt(endRow, endCol) !== 0) {
			return null;
		}

		const keyOf = (row: number, col: number): string => `${row},${col}`;
		const heuristic = (row: number, col: number): number => Math.abs(row - endRow) + Math.abs(col - endCol);

		type OpenNode = {row: number; col: number; f: number};
		const open: OpenNode[] = [{row: startRow, col: startCol, f: heuristic(startRow, startCol)}];
		const gScore = new Map<string, number>([[keyOf(startRow, startCol), 0]]);

		while (open.length > 0) {
			open.sort((left, right) => left.f - right.f);
			const current = open.shift();
			if (!current) {
				break;
			}

			if (current.row === endRow && current.col === endCol) {
				return gScore.get(keyOf(current.row, current.col)) ?? null;
			}

			const currentG = gScore.get(keyOf(current.row, current.col));
			if (typeof currentG !== 'number') {
				continue;
			}

			const neighbors: Coord[] = [
				[current.row + 1, current.col],
				[current.row - 1, current.col],
				[current.row, current.col + 1],
				[current.row, current.col - 1],
			];

			for (const [nextRow, nextCol] of neighbors) {
				if (!inBounds(nextRow, nextCol) || cellAt(nextRow, nextCol) !== 0) {
					continue;
				}

				const nextKey = keyOf(nextRow, nextCol);
				const tentative = currentG + 1;
				const bestKnown = gScore.get(nextKey);
				if (typeof bestKnown === 'number' && tentative >= bestKnown) {
					continue;
				}

				gScore.set(nextKey, tentative);
				open.push({row: nextRow, col: nextCol, f: tentative + heuristic(nextRow, nextCol)});
			}
		}

		return null;
	});
export const aStarGridShortestPath = __legacySolution;
