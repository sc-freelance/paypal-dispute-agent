// The receipt-style status badge. Text + style for each invoice status, from CLAUDE.md §6.
const CHIPS = {
  NEEDS_APPROVAL: { text: 'YOUR OK NEEDED', className: 'chip chip-attention' },
  SENDING: { text: 'SENDING…', className: 'chip chip-dashed' },
  SENT: { text: 'SENT', className: 'chip chip-dashed' },
  PAID: { text: 'PAID ✓', className: 'chip chip-ok' },
  REJECTED: { text: 'REJECTED', className: 'chip chip-faded' },
  // Dispute statuses
  DISPUTED: { text: 'DISPUTED', className: 'chip chip-alert' },
  DEFENDED: { text: 'DEFENDED', className: 'chip chip-bold' },
  WON: { text: '*** WON ***', className: 'chip chip-won' },
}

export default function StatusChip({ status }) {
  const chip = CHIPS[status] || { text: status, className: 'chip' }
  return <span className={chip.className}>{chip.text}</span>
}
