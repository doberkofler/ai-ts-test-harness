type UserEvent = {type: "user"; userId: string};
type PaymentEvent = {type: "payment"; amount: number};
type Event = UserEvent | PaymentEvent;

export function eventLabel(event: Event): string {
	if (event.type === 'user') {
		return `user:${event.userId}`;
	}
	return `payment:${event.amount}`;
}
