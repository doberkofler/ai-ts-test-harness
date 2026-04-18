type ListNode = {
	value: number;
	next: ListNode | null;
};

const __legacySolution = (function mergeSortLinkedList(head: ListNode | null): ListNode | null {
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
	});
export const mergeSortLinkedList = __legacySolution;
