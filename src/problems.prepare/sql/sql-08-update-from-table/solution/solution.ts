export const sql08UpdateProductPricesQuery = (): string => {
	return `
		UPDATE products AS p
		SET price = pu.new_price
		FROM price_updates AS pu
		WHERE p.sku = pu.sku;
	`;
};
