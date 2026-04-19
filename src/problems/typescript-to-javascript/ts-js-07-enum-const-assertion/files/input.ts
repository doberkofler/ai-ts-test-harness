const Direction = {
	Up: 'UP',
	Down: 'DOWN',
	Left: 'LEFT',
	Right: 'RIGHT',
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];

export function opposite(d: Direction): Direction {
	switch (d) {
		case Direction.Up:
			return Direction.Down;
		case Direction.Down:
			return Direction.Up;
		case Direction.Left:
			return Direction.Right;
		case Direction.Right:
			return Direction.Left;
	}
}
