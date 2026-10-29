import { deadline } from '../lib/deadline'

// UI choice 4B: "6 days left" with a colour that gets more urgent as the date nears.
export default function DeadlineChip({ date, overdueWord }) {
  if (!date) return null
  const { text, tone } = deadline(date, { overdueWord })
  return <span className={`chip deadline-${tone}`}>{text}</span>
}
