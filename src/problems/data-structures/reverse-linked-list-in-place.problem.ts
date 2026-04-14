import {defineImplementProblem} from '#problem-api';

type ListNode = {
	value: number;
	next: ListNode | null;
};

export default defineImplementProblem({
	name: 'reverse-linked-list-in-place',
	description: [
		'Reverse a singly linked list in place and return the new head.',
		'Node shape: {value: number, next: ListNode | null}. Do not allocate replacement nodes.',
	],
	signature: 'function reverseLinkedListInPlace(head: {value: number; next: any} | null): {value: number; next: any} | null',
	solution: function reverseLinkedListInPlace(head: ListNode | null): ListNode | null {
		let current = head;
		let previous: ListNode | null = null;

		while (current !== null) {
			const {next} = current;
			current.next = previous;
			previous = current;
			current = next;
		}

		return previous;
	},
	tests: ({assert, implementation}) => {
		const isListNode = (value: unknown): value is ListNode => {
			if (typeof value !== 'object' || value === null) {
				return false;
			}
			if (!('value' in value) || !('next' in value)) {
				return false;
			}

			const maybeValue: unknown = (value as {value: unknown}).value;
			const maybeNext: unknown = (value as {next: unknown}).next;
			return typeof maybeValue === 'number' && (maybeNext === null || typeof maybeNext === 'object');
		};

		const reverse = (head: ListNode | null): ListNode | null => {
			const result = implementation(head);
			if (result === null) {
				return null;
			}
			if (!isListNode(result)) {
				throw new TypeError('reverseLinkedListInPlace must return a ListNode or null');
			}
			return result;
		};

		const build = (values: readonly number[]): {head: ListNode | null; nodes: ListNode[]} => {
			const nodes: ListNode[] = values.map((value) => ({value, next: null}));
			for (let i = 0; i < nodes.length - 1; i++) {
				const node = nodes[i];
				const next = nodes[i + 1];
				if (!node || !next) {
					continue;
				}
				node.next = next;
			}

			return {head: nodes[0] ?? null, nodes};
		};

		const toArray = (head: ListNode | null): number[] => {
			const output: number[] = [];
			let cursor = head;
			while (cursor !== null) {
				output.push(cursor.value);
				cursor = cursor.next;
			}
			return output;
		};

		const empty = reverse(null);
		assert.strictEqual(empty, null);

		{
			const {head, nodes} = build([1, 2, 3, 4]);
			const reversed = reverse(head);
			assert.deepStrictEqual(toArray(reversed), [4, 3, 2, 1]);
			assert.strictEqual(reversed, nodes[3]);
			if (!reversed) {
				throw new TypeError('expected reversed list head');
			}
			const second = reversed.next;
			if (!second) {
				throw new TypeError('expected second node');
			}
			const third = second.next;
			if (!third) {
				throw new TypeError('expected third node');
			}
			const fourth = third.next;
			if (!fourth) {
				throw new TypeError('expected fourth node');
			}

			assert.strictEqual(second, nodes[2]);
			assert.strictEqual(third, nodes[1]);
			assert.strictEqual(fourth, nodes[0]);
			assert.strictEqual(fourth.next, null);
		}

		{
			const {head, nodes} = build([42]);
			const reversed = reverse(head);
			assert.strictEqual(reversed, nodes[0]);
			assert.deepStrictEqual(toArray(reversed), [42]);
		}
	},
});
