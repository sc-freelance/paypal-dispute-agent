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
    note: 'Draft ready · 3 claims · 3 sources',
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
