export const html02MultiStepCheckoutForm = (): string => {
	return `
		<form class="checkout-form" action="/checkout" method="post">
			<ol class="checkout-progress">
				<li aria-current="step">Shipping</li>
				<li>Payment</li>
				<li>Review</li>
			</ol>

			<fieldset class="step step-shipping">
				<legend>Shipping</legend>
				<label for="shipping-name">Full name</label>
				<input id="shipping-name" name="shippingName" type="text" required aria-required="true" />

				<label for="shipping-address">Street address</label>
				<input id="shipping-address" name="shippingAddress" type="text" required aria-required="true" />

				<label for="shipping-city">City</label>
				<input id="shipping-city" name="shippingCity" type="text" required aria-required="true" />
			</fieldset>

			<fieldset class="step step-payment" hidden>
				<legend>Payment</legend>
				<label for="card-number">Card number</label>
				<input id="card-number" name="cardNumber" type="text" required aria-required="true" />

				<label for="card-expiry">Expiry date</label>
				<input id="card-expiry" name="cardExpiry" type="text" required aria-required="true" />

				<label for="card-cvv">CVV</label>
				<input id="card-cvv" name="cardCvv" type="text" required aria-required="true" />
			</fieldset>

			<fieldset class="step step-review" hidden>
				<legend>Review</legend>
				<p>Confirm shipping details and payment summary before placing your order.</p>
				<label for="review-terms">I agree to the terms</label>
				<input id="review-terms" name="reviewTerms" type="checkbox" required aria-required="true" />
			</fieldset>
		</form>
	`;
};
