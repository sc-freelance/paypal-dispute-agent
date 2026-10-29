import { daysUntil } from '../lib/deadline'
import { formatMoney } from '../lib/dashboardRows'

// UI choice 11A: four number tiles beside the grid.
// Calculated in the browser for now; they move to the pandas-powered insights API in Week 3.
export default function InsightTiles({ rows, disputes }) {
  const open = disputes.filter((d) => d.stage !== 'WON')
  const atRisk = open.reduce((sum, d) => sum + Number(d.amount), 0)
  const dueDays = disputes.filter((d) => d.stage === 'NEEDS_OK').map((d) => daysUntil(d.respondBy))
  const nearest = dueDays.length ? Math.min(...dueDays) : null
  const overdue = rows.filter((r) => r.overdue).length
  const won = disputes.filter((d) => d.stage === 'WON').length

  return (
    <aside className="insights" aria-label="Insights">
      <h2 className="insights-title">INSIGHTS</h2>
      <div className="tile tile-attention">
        <div className="tile-number">{formatMoney(atRisk)}</div>
        <div>at risk in open disputes</div>
      </div>
      <div className="tile">
        <div className="tile-number">{open.length}</div>
        <div>{nearest === null ? 'open disputes' : `open disputes, nearest due in ${nearest} day${nearest === 1 ? '' : 's'}`}</div>
      </div>
      <div className="tile">
        <div className="tile-number">{overdue}</div>
        <div>overdue invoice{overdue === 1 ? '' : 's'}</div>
      </div>
      <div className="tile tile-dark">
        <div className="tile-number tile-number-won">{won}</div>
        <div>dispute{won === 1 ? '' : 's'} won</div>
      </div>
    </aside>
  )
}
