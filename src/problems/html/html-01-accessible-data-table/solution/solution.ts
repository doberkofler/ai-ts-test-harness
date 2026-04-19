export const html01AccessibleDataTable = (): string => {
	return `
		<table class="revenue-table" aria-label="Quarterly revenue by region for North, South, and East">
			<caption>Quarterly revenue by region in USD for fiscal year 2024</caption>
			<thead>
				<tr>
					<th scope="col">Region</th>
					<th scope="col">Q1</th>
					<th scope="col">Q2</th>
					<th scope="col">Q3</th>
					<th scope="col">Q4</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<th scope="row">North</th>
					<td>12,400</td>
					<td>15,200</td>
					<td>14,800</td>
					<td>18,300</td>
				</tr>
				<tr>
					<th scope="row">South</th>
					<td>9,800</td>
					<td>11,400</td>
					<td>10,200</td>
					<td>13,600</td>
				</tr>
				<tr>
					<th scope="row">East</th>
					<td>7,300</td>
					<td>8,900</td>
					<td>9,100</td>
					<td>11,200</td>
				</tr>
			</tbody>
			<tfoot>
				<tr>
					<th scope="row">Total</th>
					<td>29,500</td>
					<td>35,500</td>
					<td>34,100</td>
					<td>43,100</td>
				</tr>
			</tfoot>
		</table>
	`;
};
