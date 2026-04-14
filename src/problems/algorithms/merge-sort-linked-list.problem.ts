import {defineImplementProblem} from '#problem-api';

type ListNode = {
	value: number;
	next: ListNode | null;
};

export default defineImplementProblem({
	name: 'merge-sort-linked-list',
	description: ['Sort a singly linked list using merge sort and return the new head.', 'Do not use array-index tricks or Array.prototype.sort.'],
	signature: 'function mergeSortLinkedList(head: {value: number; next: any} | null): {value: number; next: any} | null',
	solution: function mergeSortLinkedList(head: ListNode | null): ListNode | null {
		const merge = (left: ListNode | null, right: ListNode | null): ListNode | null => {
			const dummy: ListNode = {value: 0, next: null};
			let tail = dummy;
			let a = left;
			let b = right;

			while (a !== null && b !== null) {
				if (a.value <= b.value) {
					tail.next = a;
					a = a.next;
				} else {
					tail.next = b;
					b = b.next;
				}
				tail = tail.next;
			}

			tail.next = a ?? b;
			return dummy.next;
		};

		const split = (node: ListNode): {left: ListNode; right: ListNode | null} => {
			let slow: ListNode = node;
			let fast: ListNode | null = node.next;

			while (fast !== null && fast.next !== null) {
				if (slow.next === null) {
					break;
				}
				slow = slow.next;
				fast = fast.next.next;
			}

			const right = slow.next;
			slow.next = null;
			return {left: node, right};
		};

		const sort = (node: ListNode | null): ListNode | null => {
			if (node === null) {
				return node;
			}

			if (node.next === null) {
				return node;
			}

			const {left, right} = split(node);
			return merge(sort(left), sort(right));
		};

		return sort(head);
	},
	tests: ({assert, implementation, code}) => {
		const sort = (head: ListNode | null): unknown => implementation(head);

		const build = (values: readonly number[]): ListNode | null => {
			const nodes: ListNode[] = values.map((value) => ({value, next: null}));
			for (let i = 0; i < nodes.length - 1; i++) {
				const node = nodes[i];
				const next = nodes[i + 1];
				if (!node || !next) {
					continue;
				}
				node.next = next;
			}
			return nodes[0] ?? null;
		};

		const toArray = (head: unknown): number[] => {
			const output: number[] = [];
			let cursor: unknown = head;
			while (cursor !== null) {
				if (typeof cursor !== 'object') {
					throw new TypeError('expected linked-list node object');
				}

				const value: unknown = Reflect.get(cursor, 'value');
				if (typeof value !== 'number') {
					throw new TypeError('node.value must be a number');
				}
				output.push(value);

				const next: unknown = Reflect.get(cursor, 'next');
				if (next !== null && typeof next !== 'object') {
					throw new TypeError('node.next must be an object or null');
				}
				cursor = next;
			}
			return output;
		};

		assert.deepStrictEqual(toArray(sort(build([4, 2, 1, 3]))), [1, 2, 3, 4]);
		assert.deepStrictEqual(toArray(sort(build([-1, 5, 3, 4, 0]))), [-1, 0, 3, 4, 5]);
		assert.deepStrictEqual(toArray(sort(build([]))), []);
		assert.doesNotMatch(code.result, /\.sort\s*\(/, 'must not use Array.prototype.sort');
	},
});
