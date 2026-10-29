import InvoiceList from '../components/InvoiceList'

// The Invoices tab: the existing invoice list with Approve / Reject (built 25 Oct).
export default function InvoicesPage({ invoices, loadError, onChanged }) {
  const waiting = invoices.filter((i) => i.status === 'NEEDS_APPROVAL').length
  return (
    <section className="receipt page-narrow" aria-labelledby="invoices-heading">
      <h2 id="invoices-heading">
        YOUR INVOICES {waiting > 0 && <span className="chip chip-attention">{waiting} NEED YOUR OK</span>}
      </h2>
      {loadError ? (
        <p className="error" role="alert">Couldn't load invoices ({loadError}).</p>
      ) : (
        <InvoiceList invoices={invoices} onChanged={onChanged} />
      )}
    </section>
  )
}
