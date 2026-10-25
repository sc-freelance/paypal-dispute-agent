// Every call from React to the Django API goes through these small helpers.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // Django sends {"detail": "..."} for errors; the approve endpoint sends the invoice with last_error.
    const err = new Error(data.detail || data.last_error || `HTTP ${res.status}`)
    err.data = data
    throw err
  }
  return data
}

export const getHealth = () => request('/api/health/')
export const getInvoices = () => request('/api/invoices/')
export const approveInvoice = (id) => request(`/api/invoices/${id}/approve/`, { method: 'POST' })
export const rejectInvoice = (id) => request(`/api/invoices/${id}/reject/`, { method: 'POST' })
export const sendChat = (messages) =>
  request('/api/agent/chat/', { method: 'POST', body: JSON.stringify({ messages }) })
