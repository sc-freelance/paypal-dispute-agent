// Turns a due date into "6 days left" plus a colour tone (UI choice 4B):
//   more than 7 days → grey,  7 days or less → highlighter,  3 days or less (or overdue) → red.
// The text always says the number, so colour is never the only signal (accessibility).

const DAY_MS = 24 * 60 * 60 * 1000

export function daysUntil(isoDate, now = new Date()) {
  const due = new Date(isoDate)
  // Compare calendar days, not hours, so "due tomorrow" is always 1 day.
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((startOfDue - startOfToday) / DAY_MS)
}

export function deadline(isoDate, { overdueWord = 'overdue' } = {}) {
  const days = daysUntil(isoDate)
  let text
  if (days < 0) text = `${-days} day${days === -1 ? '' : 's'} ${overdueWord}`
  else if (days === 0) text = 'Due today'
  else text = `${days} day${days === 1 ? '' : 's'} left`
  const tone = days <= 3 ? 'alert' : days <= 7 ? 'attention' : 'calm'
  return { days, text, tone }
}

// A date N days from today, as an ISO string. Used by the sample data so countdowns stay realistic.
export function daysFromNow(n) {
  return new Date(Date.now() + n * DAY_MS).toISOString()
}
