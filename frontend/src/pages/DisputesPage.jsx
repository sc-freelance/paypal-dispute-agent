import DeadlineChip from '../components/DeadlineChip'
import StatusChip from '../components/StatusChip'
import { formatMoney } from '../lib/dashboardRows'

// UI choice 3C: a board with one column per stage, so the whole journey is visible at a glance.
const COLUMNS = [
  { stage: 'NEEDS_OK', title: 'NEEDS YOUR OK', className: 'board-col board-col-attention', empty: 'Nothing waiting on you. Nice.' },
  { stage: 'SUBMITTED', title: 'SUBMITTED · WITH PAYPAL', className: 'board-col', empty: 'Nothing with PayPal right now.' },
  { stage: 'WON', title: 'WON', className: 'board-col board-col-won', empty: 'No wins yet. Give it time.' },
]

function DisputeCard({ d }) {
  return (
    <article className="dispute-card" aria-label={`Dispute ${d.id}, ${d.client}`}>
      <div className="dispute-card-top">
        <span className="mono faded small">{d.id}</span>
        {d.stage === 'NEEDS_OK' && <DeadlineChip date={d.respondBy} />}
        {d.stage === 'SUBMITTED' && <StatusChip status="DEFENDED" />}
        {d.stage === 'WON' && <StatusChip status="WON" />}
      </div>
      <div className="dispute-card-main">
        <strong>{d.client}</strong>
        <span className="mono amount">{formatMoney(d.amount, d.currency)}</span>
      </div>
      <div>
        Claims: <b>{d.reason.toLowerCase()}</b> · {d.work}
      </div>
      <div className="faded small">{d.note}</div>
      {d.stage === 'NEEDS_OK' && (
        // The review screen comes next session; the button is in place for the flow.
        <button type="button" className="btn btn-primary" disabled title="Review screen is coming next">
          Review draft →
        </button>
      )}
    </article>
  )
}

export default function DisputesPage({ disputes }) {
  return (
    <div className="board">
      {COLUMNS.map((col) => {
        const cards = disputes.filter((d) => d.stage === col.stage)
        return (
          <section key={col.stage} className={col.className} aria-labelledby={`col-${col.stage}`}>
            <h2 id={`col-${col.stage}`} className="board-col-title">
              {col.title} <span className="board-count">{cards.length}</span>
            </h2>
            {cards.length === 0 && <p className="faded">{col.empty}</p>}
            {cards.map((d) => (
              <DisputeCard key={d.id} d={d} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
