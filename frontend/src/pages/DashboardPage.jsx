import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import DeadlineChip from '../components/DeadlineChip'
import InsightTiles from '../components/InsightTiles'
import StatusChip from '../components/StatusChip'
import { SAMPLE_INVOICES } from '../data/sampleData'
import { QUICK_FILTERS, buildRows, formatMoney } from '../lib/dashboardRows'

// AG Grid Community (MIT licence): register its free features once.
ModuleRegistry.registerModules([AllCommunityModule])

// The Receipts look applied through AG Grid's Theming API (colours and fonts from CLAUDE.md §6).
const receiptsTheme = themeQuartz.withParams({
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: 15,
  foregroundColor: '#111111',
  backgroundColor: '#FFFFFF',
  headerBackgroundColor: '#111111',
  headerTextColor: '#FAF9F4',
  headerFontWeight: 700,
  borderColor: '#111111',
  accentColor: '#111111',
  rowHoverColor: '#FAF9F4',
  borderRadius: 0,
  wrapperBorderRadius: 0,
  rowBorder: { style: 'dashed', width: 1, color: '#8C8C8C' },
})

// ---- Cell renderers: small React components AG Grid uses to draw a cell ----

function StatusCell({ value, node }) {
  if (node.rowPinned) return <strong className="mono">{value}</strong> // the totals row shows text here
  return <StatusChip status={value} />
}

function DeadlineCell({ data, node }) {
  if (node.rowPinned) return <strong className="mono">{data.dueLabel}</strong>
  if (data.due) return <DeadlineChip date={data.due} />
  return <span className="faded mono small">—</span>
}

function RefCell({ value, data, node }) {
  if (node.rowPinned) return <strong className="mono">{value}</strong>
  return (
    <span className="mono">
      {value}
      {data.sample && <span className="sample-tag" title="Sample data until the demo seed exists">sample</span>}
    </span>
  )
}

export default function DashboardPage({ invoices, disputes }) {
  const gridRef = useRef(null)
  const [filterId, setFilterId] = useState('all')
  const [totals, setTotals] = useState({ count: 0, amount: 0, atRisk: 0 })

  const rows = useMemo(
    () => buildRows({ invoices, sampleInvoices: SAMPLE_INVOICES, disputes }),
    [invoices, disputes],
  )

  const columnDefs = useMemo(
    () => [
      { field: 'ref', headerName: 'Invoice', cellRenderer: RefCell, width: 165 },
      { field: 'client', headerName: 'Client', filter: 'agTextColumnFilter', width: 130 },
      { field: 'work', headerName: 'Work', flex: 1, minWidth: 120 },
      { field: 'kind', headerName: 'Type', filter: 'agTextColumnFilter', width: 95 },
      {
        field: 'amount',
        headerName: 'Amount',
        type: 'rightAligned',
        width: 110,
        valueFormatter: (p) => formatMoney(p.value, p.data?.currency),
        // Conditional styling: money in an open dispute is shown in red.
        cellClassRules: { 'cell-at-risk': (p) => !p.node.rowPinned && p.data?.atRisk },
      },
      { field: 'status', headerName: 'Status', cellRenderer: StatusCell, width: 178 },
      {
        field: 'due',
        headerName: 'Respond by',
        cellRenderer: DeadlineCell,
        width: 168,
        // Sort by real dates, with "no deadline" rows last.
        comparator: (a, b) => (a ? new Date(a) : Infinity) - (b ? new Date(b) : Infinity),
      },
    ],
    [],
  )

  // Whole-row conditional styling: rows waiting for you get a light highlighter wash.
  const rowClassRules = useMemo(() => ({ 'row-needs-ok': (p) => !p.node.rowPinned && p.data?.needsOk }), [])

  // Quick filters use AG Grid's "external filter" hooks, so they combine with the column filters.
  const activeFilter = QUICK_FILTERS.find((f) => f.id === filterId)
  const isExternalFilterPresent = useCallback(() => filterId !== 'all', [filterId])
  const doesExternalFilterPass = useCallback((node) => activeFilter.test(node.data), [activeFilter])

  function chooseFilter(id) {
    setFilterId(id)
    // Tell the grid to re-run its filters after React has updated the callbacks.
    setTimeout(() => gridRef.current?.api?.onFilterChanged(), 0)
  }

  // Recalculate the pinned totals row from whatever rows are currently visible.
  const recalcTotals = useCallback((event) => {
    let count = 0
    let amount = 0
    let atRisk = 0
    event.api.forEachNodeAfterFilter((node) => {
      count += 1
      amount += node.data.amount
      if (node.data.atRisk) atRisk += node.data.amount
    })
    setTotals({ count, amount, atRisk })
  }, [])

  const pinnedBottomRowData = useMemo(
    () => [
      {
        rowId: 'totals', // every row needs an ID, the pinned totals row included
        ref: `TOTAL · ${totals.count}`,
        amount: totals.amount,
        currency: 'GBP',
        // Spread across two cells so it fits: "£1,350.00" | "at risk"
        status: totals.atRisk > 0 ? formatMoney(totals.atRisk) : 'Nothing',
        dueLabel: 'at risk',
      },
    ],
    [totals],
  )

  return (
    <div className="dashboard">
      <section className="dashboard-grid" aria-label="Invoices and disputes">
        <div className="quick-filters" role="group" aria-label="Quick filters">
          {QUICK_FILTERS.map((f) => {
            const count = rows.filter(f.test).length
            return (
              <button
                key={f.id}
                type="button"
                className={f.id === filterId ? 'filter-btn filter-btn-active' : 'filter-btn'}
                aria-pressed={f.id === filterId}
                onClick={() => chooseFilter(f.id)}
              >
                {f.label} <span className="mono">{count}</span>
              </button>
            )
          })}
        </div>
        <div className="grid-box">
          <AgGridReact
            ref={gridRef}
            theme={receiptsTheme}
            rowData={rows}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true }}
            getRowId={(p) => p.data.rowId}
            rowClassRules={rowClassRules}
            isExternalFilterPresent={isExternalFilterPresent}
            doesExternalFilterPass={doesExternalFilterPass}
            pinnedBottomRowData={pinnedBottomRowData}
            onModelUpdated={recalcTotals}
            domLayout="autoHeight"
            overlayNoRowsTemplate="<span>No receipts match that filter.</span>"
          />
        </div>
      </section>
      <InsightTiles rows={rows} disputes={disputes} />
    </div>
  )
}
