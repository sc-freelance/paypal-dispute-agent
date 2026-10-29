import { TABS } from '../lib/tabs'

// UI choice 1A: wordmark, top tabs and the Sync button.

export default function Header({ activeTab, onTabChange, counts, onSync, syncing }) {
  return (
    <header className="topbar">
      <a className="brand" href="#dashboard" onClick={() => onTabChange('dashboard')}>
        Receipts<span className="brand-dot">.</span>
      </a>
      <nav aria-label="Main" className="tabs">
        {TABS.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={tab.id === activeTab ? 'tab tab-active' : 'tab'}
            aria-current={tab.id === activeTab ? 'page' : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {counts[tab.id] > 0 && <span className="tab-count">{counts[tab.id]}</span>}
          </a>
        ))}
      </nav>
      <button className="btn" type="button" onClick={onSync} disabled={syncing}>
        {syncing ? 'Syncing…' : '↻ Sync with PayPal'}
      </button>
    </header>
  )
}
