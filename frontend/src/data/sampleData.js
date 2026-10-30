// SAMPLE DATA ONLY: fictional invoices and disputes used while the UI is built first (decision 28 Oct).
// They'll be replaced by real data from PayPal (via Django) once the dispute backend and seed_demo exist.
// Every sample row is marked `sample: true`, and the grid labels it, so it can't be mistaken for real data.
// The fields mirror PayPal's dispute shape where we know it (docs/DISPUTES_API.md).

import { daysFromNow } from '../lib/deadline'

export const SAMPLE_DISPUTES = [
  {
    id: 'PP-D-4821',
    stage: 'NEEDS_OK', // our board column: NEEDS_OK → SUBMITTED → WON
    client: 'Ahmed R.',
    invoice: 'INV-0042',
    work: 'Logo design pack',
    amount: '450.00',
    currency: 'GBP',
    reason: 'Item not received',
    respondBy: daysFromNow(6),
    note: 'Draft ready · 4 claims · 5 sources',
  },
  {
    id: 'PP-D-4830',
    stage: 'NEEDS_OK',
    client: 'Kiran M.',
    invoice: 'INV-0045',
    work: 'Product photos',
    amount: '300.00',
    currency: 'GBP',
    reason: 'Not as described',
    respondBy: daysFromNow(2),
    note: 'Draft ready · 2 claims · 1 gap flagged',
  },
  {
    id: 'PP-D-4799',
    stage: 'SUBMITTED',
    client: 'Oakwood Events',
    invoice: 'INV-0047',
    work: 'Event branding',
    amount: '600.00',
    currency: 'GBP',
    reason: 'Not as described',
    respondBy: daysFromNow(9),
    note: 'Evidence sent · waiting on PayPal',
  },
  {
    id: 'PP-D-4760',
    stage: 'WON',
    client: 'Studio Nine',
    invoice: 'INV-0036',
    work: 'Social templates',
    amount: '250.00',
    currency: 'GBP',
    reason: 'Item not received',
    respondBy: null,
    note: 'Closed · you kept £250',
  },
]

// Sample invoices that aren't disputed, so the dashboard shows every status.
// `due` is when payment is due; a SENT invoice past its due date counts as overdue.
export const SAMPLE_INVOICES = [
  { ref: 'INV-0048', client: 'Bloom & Co', work: 'Website copy', amount: '300.00', currency: 'GBP', status: 'NEEDS_APPROVAL', due: null },
  { ref: 'INV-0040', client: 'Northside Café', work: 'Menu design', amount: '180.00', currency: 'GBP', status: 'SENT', due: daysFromNow(-4) },
  { ref: 'INV-0039', client: 'Studio Nine', work: 'Brand guidelines', amount: '1200.00', currency: 'GBP', status: 'PAID', due: null },
  { ref: 'INV-0038', client: 'Ahmed R.', work: 'Business cards', amount: '120.00', currency: 'GBP', status: 'PAID', due: null },
]

// Sample AI drafts, one per dispute that needs your OK. Shaped like what the dispute agent will return:
// - claims: factual sentences for PayPal, each listing the source records it relies on
// - sources: the records on file (messages, deliveries, PayPal's own payment record)
// - gaps: things the client mentions that we have NO record of. The agent flags these instead of
//   inventing a claim (the honesty rule).
export const SAMPLE_DRAFTS = {
  'PP-D-4821': {
    clientQuote: 'I never received the logo pack.',
    agentNote: "Good news: we've got receipts. Four claims, five sources. Give it a look before I send.",
    claims: [
      { id: 'c1', text: 'On 2 October 2026 the buyer agreed the scope in writing: three logo concepts, one revision round, and final files in PNG and SVG.', sources: ['s1'] },
      { id: 'c2', text: "On 14 October 2026 at 16:02 UTC, the final logo files were emailed to the buyer's PayPal email address.", sources: ['s2'] },
      { id: 'c3', text: 'The download link was opened twice on 14 October 2026, and at 18:40 the buyer replied: "Thanks, files look great."', sources: ['s3', 's4'] },
      { id: 'c4', text: "PayPal's own transaction record shows the buyer paid £450.00 for invoice INV-0042 on 10 October 2026.", sources: ['s5'] },
    ],
    sources: [
      { id: 's1', ref: 'M-0012', kind: 'Message', label: 'Scope agreed', when: '2 Oct 2026, 10:14' },
      { id: 's2', ref: 'D-0031', kind: 'Delivery', label: 'Final files emailed', when: '14 Oct 2026, 16:02' },
      { id: 's3', ref: 'D-0032', kind: 'Delivery', label: 'Download link opened ×2', when: '14 Oct 2026' },
      { id: 's4', ref: 'M-0019', kind: 'Message', label: '"Thanks, files look great"', when: '14 Oct 2026, 18:40' },
      { id: 's5', ref: 'P-0007', kind: 'PayPal record', label: '£450.00 paid (Transaction Search)', when: '10 Oct 2026' },
    ],
    gaps: [],
  },
  'PP-D-4830': {
    clientQuote: "These aren't the photos we agreed. You promised a reshoot.",
    agentNote: "Mostly covered, one gap. Kiran mentions a reshoot and there's no record of one, so I've left it out rather than guess.",
    claims: [
      { id: 'c1', text: "On 3 October 2026 the buyer's written brief requested 12 product photos on a white background.", sources: ['s1'] },
      { id: 'c2', text: 'On 9 October 2026, 12 edited product photos on a white background were delivered to the buyer.', sources: ['s2'] },
    ],
    sources: [
      { id: 's1', ref: 'M-0031', kind: 'Message', label: 'Photo brief', when: '3 Oct 2026, 09:40' },
      { id: 's2', ref: 'D-0044', kind: 'Delivery', label: '12 photos delivered', when: '9 Oct 2026, 15:12' },
    ],
    gaps: ['The buyer mentions a promised reshoot. There is no record of a reshoot being agreed, so no claim was made about it.'],
  },
}
