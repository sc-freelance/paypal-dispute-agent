import { useEffect, useState } from 'react'

// One line on the "System check" receipt: a label on the left, a status chip on the right.
function StatusLine({ label, ok, okText = 'READY', badText = 'MISSING' }) {
  return (
    <li>
      <span>{label}</span>
      <span className={`chip ${ok ? 'chip-ok' : 'chip-attention'}`}>{ok ? `${okText} ✓` : badText}</span>
    </li>
  )
}

export default function App() {
  // health = the JSON from GET /api/health/. null while loading; error holds a message if the call fails.
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  // Runs once when the page loads: ask Django whether the backend is up.
  useEffect(() => {
    fetch('/api/health/')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setHealth)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="page">
      <header className="masthead">
        <p className="meta">FREELANCE DISPUTE DEFENCE · POWERED BY PAYPAL + CLAUDE</p>
        <h1 className="wordmark">
          Receipts<span className="mark">.</span>
        </h1>
        <p className="tagline">
          You did the work. <span className="mark">We keep the receipts.</span>
        </p>
      </header>

      <div className="grid">
        <section className="receipt" aria-labelledby="invoices-heading">
          <h2 id="invoices-heading">YOUR INVOICES</h2>
          <p className="empty">No receipts yet. Send your first invoice and I'll start keeping them.</p>
        </section>

        <section className="receipt" aria-labelledby="system-heading" aria-live="polite">
          <h2 id="system-heading">SYSTEM CHECK</h2>
          {error && (
            <p>
              <span className="chip chip-alert">BACKEND DOWN</span> Couldn't reach the API ({error}).
            </p>
          )}
          {!error && !health && <p>Checking the receipts…</p>}
          {health && (
            <ul className="lines">
              <StatusLine label="Django backend" ok={health.status === 'ok'} okText="UP" />
              <StatusLine label="PayPal sandbox keys" ok={health.paypal_configured} />
              <StatusLine label="Anthropic key" ok={health.anthropic_configured} />
              <li>
                <span>AI model</span>
                <span className="chip chip-ok">{health.model || 'NOT SET'}</span>
              </li>
            </ul>
          )}
        </section>
      </div>

      <p className="footnote">Skeleton build · Week 1 · sandbox only</p>
    </main>
  )
}
