import { useCallback, useEffect, useState } from 'react'
import { getHealth, getInvoices } from './api'
import Chat from './components/Chat'
import InvoiceList from './components/InvoiceList'

export default function App() {
  const [invoices, setInvoices] = useState([])
  const [health, setHealth] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Reload invoices from the server. Passed down so the chat and the list can ask for a refresh.
  const refreshInvoices = useCallback(() => {
    getInvoices()
      .then((data) => {
        setInvoices(data)
        setLoadError(null)
      })
      .catch((err) => setLoadError(err.message))
  }, [])

  // On page load: fetch invoices and the system check once.
  useEffect(() => {
    refreshInvoices()
    getHealth().then(setHealth).catch(() => setHealth(null))
  }, [refreshInvoices])

  const waiting = invoices.filter((i) => i.status === 'NEEDS_APPROVAL').length

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
        <section className="receipt" aria-labelledby="chat-heading">
          <h2 id="chat-heading">ASK RECEIPTS</h2>
          <Chat onInvoicesChanged={refreshInvoices} />
        </section>

        <section className="receipt" aria-labelledby="invoices-heading">
          <h2 id="invoices-heading">
            YOUR INVOICES {waiting > 0 && <span className="chip chip-attention">{waiting} NEED YOUR OK</span>}
          </h2>
          {loadError ? <p className="error" role="alert">Couldn't load invoices ({loadError}).</p> : (
            <InvoiceList invoices={invoices} onChanged={refreshInvoices} />
          )}
        </section>
      </div>

      <p className="footnote">
        {health
          ? `Backend up · PayPal keys ${health.paypal_configured ? 'set' : 'MISSING'} · AI ${health.model || 'not set'} · sandbox only`
          : 'Checking the backend…'}
      </p>
    </main>
  )
}
