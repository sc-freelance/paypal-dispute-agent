// Builds the dashboard grid's rows: one row per invoice, with disputes shown on their invoice's row.
// Real invoices come from Django; sample rows (marked sample: true) fill in until seed_demo exists.

import { daysUntil } from './deadline'

const DISPUTE_STATUS = { NEEDS_OK: 'DISPUTED', SUBMITTED: 'DEFENDED', WON: 'WON' }

export function buildRows({ invoices, sampleInvoices, disputes }) {
  const real = invoices.map((inv) => ({
    rowId: `real-${inv.id}`,
    ref: `#${String(inv.id).padStart(4, '0')}`,
    client: inv.client_name,
    work: inv.description,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status,
    kind: 'Invoice',
    due: null,
    sample: false,
  }))

  const sampleInv = sampleInvoices.map((inv) => ({
    rowId: `sample-${inv.ref}`,
    ...inv,
    amount: Number(inv.amount),
    kind: 'Invoice',
    sample: true,
  }))

  const disputeRows = disputes.map((d) => ({
    rowId: `dispute-${d.id}`,
    ref: d.invoice,
    client: d.client,
    work: d.work,
    amount: Number(d.amount),
    currency: d.currency,
    status: DISPUTE_STATUS[d.stage],
    kind: 'Dispute',
    disputeId: d.id,
    due: d.stage === 'NEEDS_OK' ? d.respondBy : null, // only show a countdown while it's waiting on you
    sample: true,
  }))

  return [...disputeRows, ...sampleInv, ...real].map((row) => ({
    ...row,
    needsOk: row.status === 'NEEDS_APPROVAL' || row.status === 'DISPUTED',
    overdue: row.kind === 'Invoice' && row.status === 'SENT' && row.due !== null && daysUntil(row.due) < 0,
    atRisk: row.status === 'DISPUTED' || row.status === 'DEFENDED',
  }))
}

// The quick filters above the grid (UI choice 10B), each a test a row passes or fails.
export const QUICK_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'disputed', label: 'Disputed', test: (r) => r.kind === 'Dispute' && r.status !== 'WON' },
  { id: 'needsOk', label: 'Needs my OK', test: (r) => r.needsOk },
  { id: 'overdue', label: 'Overdue', test: (r) => r.overdue },
]

export function formatMoney(amount, currency = 'GBP') {
  const symbol = currency === 'GBP' ? '£' : `${currency} `
  return symbol + Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
