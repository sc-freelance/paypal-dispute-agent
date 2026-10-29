import { useCallback, useEffect, useState } from 'react'
import { getHealth, getInvoices } from './api'
import ChatDrawer from './components/ChatDrawer'
import DemoStrip from './components/DemoStrip'
import Header from './components/Header'
import { SAMPLE_DISPUTES } from './data/sampleData'
import { TABS } from './lib/tabs'
import DashboardPage from './pages/DashboardPage'
import DisputesPage from './pages/DisputesPage'
import InvoicesPage from './pages/InvoicesPage'

// Which tab is showing comes from the URL hash (#dashboard, #disputes, #invoices),
// so the browser's back button and bookmarks work without a routing library.
function tabFromHash() {
  const id = window.location.hash.replace('#', '')
  return TABS.some((t) => t.id === id) ? id : 'dashboard'
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [invoices, setInvoices] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [health, setHealth] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const disputes = SAMPLE_DISPUTES // sample data until the dispute backend exists

  const refreshInvoices = useCallback(() => {
    return getInvoices()
      .then((data) => {
        setInvoices(data)
        setLoadError(null)
      })
      .catch((err) => setLoadError(err.message))
  }, [])

  useEffect(() => {
    refreshInvoices()
    getHealth().then(setHealth).catch(() => setHealth(null))
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [refreshInvoices])

  // "Sync with PayPal": for now this reloads invoices; disputes join in once their backend exists.
  async function handleSync() {
    setSyncing(true)
    await refreshInvoices()
    setSyncing(false)
  }

  const counts = {
    disputes: disputes.filter((d) => d.stage === 'NEEDS_OK').length,
    invoices: invoices.filter((i) => i.status === 'NEEDS_APPROVAL').length,
  }

  return (
    <>
      {health?.demo_mode && <DemoStrip />}
      <Header activeTab={tab} onTabChange={setTab} counts={counts} onSync={handleSync} syncing={syncing} />
      <main className="page">
        {tab === 'dashboard' && <DashboardPage invoices={invoices} disputes={disputes} />}
        {tab === 'disputes' && <DisputesPage disputes={disputes} />}
        {tab === 'invoices' && <InvoicesPage invoices={invoices} loadError={loadError} onChanged={refreshInvoices} />}
      </main>
      <ChatDrawer onInvoicesChanged={refreshInvoices} />
    </>
  )
}
