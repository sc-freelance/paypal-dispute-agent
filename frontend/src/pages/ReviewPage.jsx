import { useMemo, useState } from 'react'
import ClaimCard from '../components/ClaimCard'
import ConfirmSendDialog from '../components/ConfirmSendDialog'
import DeadlineChip from '../components/DeadlineChip'
import { formatMoney } from '../lib/dashboardRows'

// PayPal's limit for the notes sent with evidence (docs/DISPUTES_API.md).
const NOTES_LIMIT = 2000

// UI choice 5B: the dispute review screen as one printed receipt, with numbered sources at the bottom.
export default function ReviewPage({ dispute, draft, sampleMode, onUpdate }) {
  // Each claim gets a status ('kept' or 'removed') and may be edited. This is your working copy;
  // the AI's original draft isn't changed.
  const [claims, setClaims] = useState(() => (draft?.claims ?? []).map((c) => ({ ...c, status: 'kept', edited: false })))
  const [editingCount, setEditingCount] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(null)

  // Sources are numbered in the order they appear: s1 → 1, s2 → 2, ...
  const sourceNumber = useMemo(() => Object.fromEntries((draft?.sources ?? []).map((s, i) => [s.id, i + 1])), [draft])

  if (!dispute || !draft) {
    return (
      <div className="page-narrow">
        <a href="#disputes" className="mono">← All disputes</a>
        <p className="empty">Couldn't find that dispute. It may have been settled already.</p>
      </div>
    )
  }

  const kept = claims.filter((c) => c.status === 'kept')
  const keptSourceIds = new Set(kept.flatMap((c) => c.sources))
  // The evidence notes PayPal will get: the kept claims, numbered, one per line.
  const notes = kept.map((c, i) => `${i + 1}. ${c.text}`).join('\n')
  const tooLong = notes.length > NOTES_LIMIT
  const canApprove = kept.length > 0 && !tooLong && editingCount === 0

  function changeClaim(id, changes) {
    setClaims((all) => all.map((c) => (c.id === id ? { ...c, ...changes } : c)))
  }

  // Clicking a footnote number scrolls to that source and highlights it for a moment.
  function showSource(n) {
    document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlighted(n)
    setTimeout(() => setHighlighted(null), 1600)
  }

  function confirmSend() {
    setConfirmOpen(false)
    onUpdate(
      dispute.id,
      { stage: 'SUBMITTED', note: `Evidence sent · ${kept.length} claims · waiting on PayPal` },
      sampleMode
        ? `Marked ${dispute.id} as submitted. Sample only, so nothing went to PayPal.`
        : `Sent. ${dispute.client}'s dispute is with PayPal now.`,
    )
  }

  function rejectDraft() {
    onUpdate(dispute.id, { note: 'Draft rejected · needs a new draft' }, `Draft for ${dispute.id} rejected. Nothing was sent.`)
  }

  return (
    <div className="page-narrow">
      <a href="#disputes" className="mono">← All disputes</a>

      <article className="receipt-doc" aria-labelledby="review-title">
        <header className="receipt-doc-section">
          <p className="mono faded small">
            DISPUTE {dispute.id} · INVOICE {dispute.invoice}
          </p>
          <div className="receipt-doc-title">
            <h1 id="review-title">{dispute.client}</h1>
            <span className="mono receipt-doc-amount">{formatMoney(dispute.amount, dispute.currency)}</span>
          </div>
          <div className="actions">
            <span className="chip chip-alert">{dispute.reason.toUpperCase()}</span>
            {dispute.respondBy && <DeadlineChip date={dispute.respondBy} />}
          </div>
          <blockquote className="client-quote">
            "{draft.clientQuote}" <span className="faded small">({dispute.client}, via PayPal)</span>
          </blockquote>
        </header>

        <p className="agent-note">{draft.agentNote}</p>

        <section className="receipt-doc-section" aria-labelledby="draft-title">
          <h2 id="draft-title" className="section-title">DRAFT RESPONSE TO PAYPAL</h2>
          <p className="faded small">
            This is the exact text PayPal will read, so it's factual and professional. Each claim keeps its source.
          </p>
          {claims.map((c, i) => (
            <ClaimCard
              key={c.id}
              number={i + 1}
              claim={c}
              sourceNumbers={c.sources.map((id) => sourceNumber[id])}
              onChange={(changes) => changeClaim(c.id, changes)}
              onEditingChange={(isEditing) => setEditingCount((n) => n + (isEditing ? 1 : -1))}
              onSourceClick={showSource}
            />
          ))}
        </section>

        {draft.gaps.length > 0 && (
          <section className="receipt-doc-section gaps" aria-labelledby="gaps-title">
            <h2 id="gaps-title" className="section-title">GAPS · NOT CLAIMED</h2>
            <ul>
              {draft.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="receipt-doc-section" aria-labelledby="sources-title">
          <h2 id="sources-title" className="section-title">SOURCES</h2>
          <ol className="sources">
            {draft.sources.map((s, i) => (
              <li
                key={s.id}
                id={`source-${i + 1}`}
                className={[
                  highlighted === i + 1 ? 'source-highlight' : '',
                  keptSourceIds.has(s.id) ? '' : 'source-unused',
                ].join(' ')}
              >
                <b>
                  {s.kind} {s.ref}
                </b>{' '}
                · {s.label} · {s.when}
              </li>
            ))}
          </ol>
          <p className={tooLong ? 'error mono small' : 'faded mono small'}>
            Evidence type OTHER · {kept.length} claim{kept.length === 1 ? '' : 's'} · {notes.length.toLocaleString('en-GB')} /{' '}
            {NOTES_LIMIT.toLocaleString('en-GB')} characters
          </p>
        </section>

        <footer className="receipt-doc-section actions">
          <button type="button" className="btn btn-primary btn-large" disabled={!canApprove} onClick={() => setConfirmOpen(true)}>
            Approve &amp; submit to PayPal
          </button>
          <button type="button" className="btn btn-large" onClick={rejectDraft}>
            Reject draft
          </button>
          {!canApprove && (
            <p className="faded small" role="status">
              {editingCount > 0
                ? 'Finish editing first.'
                : kept.length === 0
                  ? 'Keep at least one claim to send.'
                  : 'Too long for PayPal. Remove or shorten a claim.'}
            </p>
          )}
        </footer>
      </article>

      <ConfirmSendDialog
        open={confirmOpen}
        dispute={dispute}
        claimCount={kept.length}
        sourceCount={keptSourceIds.size}
        sampleMode={sampleMode}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmSend}
      />
    </div>
  )
}
