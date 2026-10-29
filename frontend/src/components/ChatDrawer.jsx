import { useEffect, useRef, useState } from 'react'
import Chat from './Chat'

// UI choice 2C: an "Ask Receipts" button on every page that slides the chat in from the right.
// The drawer stays mounted when closed (just hidden), so the conversation isn't lost.
export default function ChatDrawer({ onInvoicesChanged }) {
  const [open, setOpen] = useState(false)
  const openButtonRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    // When it opens: move keyboard focus into the chat box, and let Escape close it.
    panelRef.current?.querySelector('input')?.focus()
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function close() {
    setOpen(false)
    openButtonRef.current?.focus() // give focus back to where the user was
  }

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        className="ask-button"
        aria-expanded={open}
        aria-controls="ask-drawer"
        onClick={() => setOpen(true)}
      >
        Ask Receipts
      </button>

      {/* Clicking the dimmed page behind the drawer closes it */}
      {open && <div className="drawer-backdrop" onClick={close} aria-hidden="true" />}

      <aside
        id="ask-drawer"
        ref={panelRef}
        className={open ? 'drawer drawer-open' : 'drawer'}
        aria-label="Ask Receipts"
        inert={!open} // when closed, it can't be tabbed into or read out
      >
        <div className="drawer-head">
          <h2 className="drawer-title">ASK RECEIPTS</h2>
          <button type="button" className="btn" onClick={close} aria-label="Close chat">
            ×
          </button>
        </div>
        <div className="drawer-body">
          <Chat onInvoicesChanged={onInvoicesChanged} />
        </div>
      </aside>
    </>
  )
}
