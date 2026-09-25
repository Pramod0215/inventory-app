export default function InvoiceTable({ rows = [] }) {
  return (
    <table className="invoice-table">
      <thead>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.quantity}</td>
            <td>₹{row.price}</td>
            <td>₹{row.price * row.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
