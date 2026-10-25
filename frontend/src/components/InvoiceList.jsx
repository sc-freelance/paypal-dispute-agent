import { useState } from 'react'
import { approveInvoice, rejectInvoice } from '../api'
import StatusChip from './StatusChip'

// The "Your invoices" receipt: every invoice, with Approve / Reject on the ones waiting for you.
export default function InvoiceList({ invoices, onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const [errors, setErrors] = useState({}) // invoice id → error message

  async function act(id, action) {
    setBusyId(id)
    setErrors((e) => ({ ...e, [id]: null }))
    try {
      await (action === 'approve' ? approveInvoice(id) : rejectInvoice(id))
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: err.message }))
    } finally {
      setBusyId(null)
      onChanged() // reload the list either way, so the status shown is always the server's
    }
  }

  if (invoices.length === 0) {
    return <p className="empty">No receipts yet. Send your first invoice and I'll start keeping them.</p>
  }

  return (
    <ul className="invoices">
      {invoices.map((inv) => (
        <li key={inv.id} className={inv.status === 'NEEDS_APPROVAL' ? 'invoice invoice-attention' : 'invoice'}>
          <div className="invoice-top">
            <span className="mono">#{String(inv.id).padStart(4, '0')}</span>
            <StatusChip status={inv.status} />
          </div>
          <div className="invoice-main">
            <div>
              <strong>{inv.client_name}</strong>
              <div className="faded">{inv.description}</div>
            </div>
            <span className="amount mono">
              {inv.currency === 'GBP' ? '£' : `${inv.currency} `}
              {inv.amount}
            </span>
          </div>
          {inv.paypal_id && <div className="faded mono small">PayPal {inv.paypal_id} · {inv.paypal_status}</div>}
          {(errors[inv.id] || inv.last_error) && (
            <p className="error" role="alert">Couldn't send: {errors[inv.id] || inv.last_error}</p>
          )}
          {inv.status === 'NEEDS_APPROVAL' && (
            <div className="actions">
              <button className="btn btn-primary" disabled={busyId === inv.id} onClick={() => act(inv.id, 'approve')}>
                {busyId === inv.id ? 'Sending…' : 'Approve & send via PayPal'}
              </button>
              <button className="btn" disabled={busyId === inv.id} onClick={() => act(inv.id, 'reject')}>
                Reject
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
