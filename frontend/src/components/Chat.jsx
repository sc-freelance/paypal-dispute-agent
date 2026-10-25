import { useEffect, useRef, useState } from 'react'
import { sendChat } from '../api'

// Plain-English labels for the agent's tools, shown in the "what I did" lines.
const TOOL_LABELS = {
  draft_invoice: 'Drafted invoice',
  list_invoices: 'Checked your invoices',
  list_paypal_invoices: 'Checked PayPal',
}

function ToolLines({ calls }) {
  if (!calls?.length) return null
  return (
    <ul className="tool-lines" aria-label="What the agent did">
      {calls.map((c, i) => (
        <li key={i} className={c.ok ? '' : 'tool-error'}>
          <span className="mono">{c.ok ? '✓' : '✗'}</span> {TOOL_LABELS[c.tool] || c.tool}
          {c.result?.invoice_id && <span className="mono"> #{String(c.result.invoice_id).padStart(4, '0')}</span>}
          {c.result?.error && <span>: {c.result.error}</span>}
        </li>
      ))}
    </ul>
  )
}

export default function Chat({ onInvoicesChanged }) {
  // Each message: { role: 'user' | 'assistant', content: string, toolCalls?: [...] }
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState(null)
  const endRef = useRef(null)

  // Keep the newest message in view.
  useEffect(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [messages, thinking])

  async function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || thinking) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setThinking(true)
    setError(null)
    try {
      // Send only role + content: the server doesn't need our display extras.
      const data = await sendChat(next.map(({ role, content }) => ({ role, content })))
      setMessages([...next, { role: 'assistant', content: data.reply, toolCalls: data.tool_calls }])
      if (data.tool_calls?.length) onInvoicesChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="chat">
      <div className="chat-log" aria-live="polite">
        {messages.length === 0 && (
          <p className="faded">
            Try: <span className="mono">"Invoice Ahmed R. £450 for the logo design pack"</span>
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble bubble-${m.role}`}>
            <span className="sr-only">{m.role === 'user' ? 'You said:' : 'Receipts said:'}</span>
            <p>{m.content}</p>
            <ToolLines calls={m.toolCalls} />
          </div>
        ))}
        {thinking && <p className="faded">Checking the receipts…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <label htmlFor="chat-input" className="sr-only">Message Receipts</label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Who are we invoicing?"
          autoComplete="off"
        />
        <button className="btn btn-primary" type="submit" disabled={thinking || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
