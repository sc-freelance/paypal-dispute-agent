import { useState } from 'react'

// UI choice 6A: one card per claim. You can keep, reword or remove it, but its source stays attached,
// so a claim can never lose the record that backs it up (the honesty rule).
export default function ClaimCard({ number, claim, sourceNumbers, onChange, onEditingChange, onSourceClick }) {
  const [editing, setEditing] = useState(false)
  const [draftText, setDraftText] = useState(claim.text)
  const removed = claim.status === 'removed'

  function startEdit() {
    setDraftText(claim.text)
    setEditing(true)
    onEditingChange(true)
  }

  function finishEdit(save) {
    if (save) onChange({ text: draftText.trim(), edited: true })
    setEditing(false)
    onEditingChange(false)
  }

  const sourceLinks = sourceNumbers.map((n, i) => (
    <span key={n}>
      {i > 0 && ','}
      <button type="button" className="footnote-ref" onClick={() => onSourceClick(n)} aria-label={`Source ${n}`}>
        {n}
      </button>
    </span>
  ))

  if (editing) {
    const empty = draftText.trim().length === 0
    return (
      <div className="claim-card claim-card-editing">
        <label htmlFor={`claim-${claim.id}`} className="claim-label">
          EDITING CLAIM {number}
        </label>
        <textarea
          id={`claim-${claim.id}`}
          rows={3}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          autoFocus
        />
        <p className="small">
          Source stays attached: <b className="mono">{sourceNumbers.join(', ')}</b>. Reword it, but don't add anything that
          source doesn't show.
        </p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => finishEdit(true)} disabled={empty}>
            Save
          </button>
          <button type="button" className="btn" onClick={() => finishEdit(false)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={removed ? 'claim-card claim-card-removed' : 'claim-card'}>
      <p className="claim-text">
        <span className="mono">{number}.</span> {claim.text}
        <sup className="footnote-refs">{sourceLinks}</sup>
      </p>
      <div className="actions">
        {removed ? (
          <>
            <span className="faded small">Removed. It won't be sent.</span>
            <button type="button" className="btn" onClick={() => onChange({ status: 'kept' })}>
              Undo
            </button>
          </>
        ) : (
          <>
            <span className="chip chip-ok">✓ KEPT{claim.edited ? ' · EDITED' : ''}</span>
            <button type="button" className="btn" onClick={startEdit}>
              Edit
            </button>
            <button type="button" className="btn" onClick={() => onChange({ status: 'removed' })}>
              Remove
            </button>
          </>
        )}
      </div>
    </div>
  )
}
