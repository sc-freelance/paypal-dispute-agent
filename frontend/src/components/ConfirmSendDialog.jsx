import { useEffect, useRef } from 'react'
import { formatMoney } from '../lib/dashboardRows'

// UI choice 7A: a confirmation window before anything is sent to PayPal.
// Uses the browser's built-in <dialog>: showModal() traps keyboard focus inside it,
// dims the page behind, and closes on Escape, all accessible out of the box.
export default function ConfirmSendDialog({ open, dispute, claimCount, sourceCount, sampleMode, onCancel, onConfirm }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // onCancel fires when Escape is pressed; we treat it the same as the Cancel button.
    <dialog ref={ref} className="confirm-dialog" aria-labelledby="confirm-title" onCancel={onCancel}>
      <h2 id="confirm-title">Send this response to PayPal?</h2>
      <dl className="confirm-facts">
        <dt>Dispute</dt>
        <dd className="mono">{dispute.id}</dd>
        <dt>Client · amount</dt>
        <dd>
          {dispute.client} · {formatMoney(dispute.amount, dispute.currency)}
        </dd>
        <dt>Claims</dt>
        <dd>
          {claimCount} claim{claimCount === 1 ? '' : 's'}, {sourceCount} source{sourceCount === 1 ? '' : 's'}
        </dd>
        <dt>Evidence type</dt>
        <dd className="mono">OTHER</dd>
      </dl>
      <p className="confirm-warning">Once it's sent, PayPal reviews it and you can't edit it. Nothing else is shared.</p>
      {sampleMode && (
        <p className="small faded">Sample data: this only updates the screen. Nothing is sent to PayPal yet.</p>
      )}
      <div className="actions actions-end">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          Send to PayPal
        </button>
      </div>
    </dialog>
  )
}
