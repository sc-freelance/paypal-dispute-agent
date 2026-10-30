import { useCallback, useEffect, useState } from 'react'
import { getHealth, getInvoices } from './api'
import ChatDrawer from './components/ChatDrawer'
import DemoStrip from './components/DemoStrip'
import Header from './components/Header'
import { SAMPLE_DISPUTES, SAMPLE_DRAFTS } from './data/sampleData'
import { TABS } from './lib/tabs'
import DashboardPage from './pages/DashboardPage'
import DisputesPage from './pages/DisputesPage'
import InvoicesPage from './pages/InvoicesPage'
import ReviewPage from './pages/ReviewPage'

// The URL hash says what to show: #dashboard, #disputes, #invoices, or #disputes/PP-D-4821 for one
// dispute's review screen. Using the hash means Back, refresh and bookmarks all work, with no routing library.
function routeFromHash() {
  const [tab, disputeId] = window.location.hash.replace('#', '').split('/')
  return {
    tab: TABS.some((t) => t.id === tab) ? tab : 'dashboard',
    disputeId: tab === 'disputes' && disputeId ? decodeURIComponent(disputeId) : null,
  }
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash)
  const tab = route.tab
  const [invoices, setInvoices] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [health, setHealth] = useState(null)
  const [syncing, setSyncing] = useState(false)
  // Sample data until the dispute backend exists. Kept in state so approving one can move it on the board.
  const [disputes, setDisputes] = useState(SAMPLE_DISPUTES)
  const [flash, setFlash] = useState(null) // a one-off message shown on the board after an action

  // Called by the review screen. Sample mode: this only changes what's on screen; nothing goes to PayPal.
  function updateDispute(id, changes, message) {
    setDisputes((all) => all.map((d) => (d.id === id ? { ...d, ...changes } : d)))
    setFlash(message)
    window.location.hash = 'disputes'
  }

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
    const onHash = () => setRoute(routeFromHash())
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
      <Header
        activeTab={tab}
        onTabChange={(id) => setRoute({ tab: id, disputeId: null })}
        counts={counts}
        onSync={handleSync}
        syncing={syncing}
      />
      <main className="page">
        {tab === 'dashboard' && <DashboardPage invoices={invoices} disputes={disputes} />}
        {tab === 'disputes' && !route.disputeId && (
          <DisputesPage disputes={disputes} flash={flash} onDismissFlash={() => setFlash(null)} />
        )}
        {tab === 'disputes' && route.disputeId && (
          <ReviewPage
            key={route.disputeId} // a fresh working copy for each dispute
            dispute={disputes.find((d) => d.id === route.disputeId)}
            draft={SAMPLE_DRAFTS[route.disputeId]}
            sampleMode
            onUpdate={updateDispute}
          />
        )}
        {tab === 'invoices' && <InvoicesPage invoices={invoices} loadError={loadError} onChanged={refreshInvoices} />}
      </main>
      <ChatDrawer onInvoicesChanged={refreshInvoices} />
    </>
  )
}
