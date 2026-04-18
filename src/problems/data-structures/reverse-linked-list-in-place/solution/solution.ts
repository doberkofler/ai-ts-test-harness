type ListNode = {
	value: number;
	next: ListNode | null;
};

const __legacySolution = (function reverseLinkedListInPlace(head: ListNode | null): ListNode | null {
		let current = head;
		let previous: ListNode | null = null;

		while (current !== null) {
			const {next} = current;
			current.next = previous;
			previous = current;
			current = next;
		}

		return previous;
	});
export const reverseLinkedListInPlace = __legacySolution;
