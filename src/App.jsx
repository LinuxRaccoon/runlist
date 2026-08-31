import { useEffect, useRef, useState } from 'react'
import ScanScreen from './components/ScanScreen'
import StopCard from './components/StopCard'
import { scanImageForPostcodes } from './utils/ocr'
import { scanImageWithGemini } from './utils/geminiScan'
import { loadRun, saveRun, clearRun, makeId } from './utils/storage'

const IMAP_URL =
  'https://www.westsussex.gov.uk/land-waste-and-housing/public-paths-and-the-countryside/public-rights-of-way/public-rights-of-way-imap/imap/'

export default function App() {
  const [stops, setStops] = useState(() => loadRun())
  const [scanning, setScanning] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [scanMode, setScanMode] = useState('quick') // 'quick' = Tesseract, 'detailed' = Gemini
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // Persist on every change so a backgrounded/reloaded tab doesn't lose the run.
  useEffect(() => {
    saveRun(stops)
  }, [stops])

  function showToast(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  async function handleFileSelected(file, mode = scanMode) {
    setScanning(true)
    setProgressLabel(mode === 'detailed' ? 'Sending to detailed scan…' : 'Starting…')
    setProgressPct(0)

    try {
      let newStops

      if (mode === 'detailed') {
        const drops = await scanImageWithGemini(file)
        if (drops.length === 0) {
          showToast('No drops found — try a clearer photo')
          return
        }
        newStops = drops.map((d) => ({
          id: makeId(),
          postcode: (d.postcode || '').toUpperCase(),
          detail: d.houseNumberOrName || '',
          status: 'pending',
        }))
      } else {
        const matches = await scanImageForPostcodes(file, (status, pct) => {
          setProgressLabel(status.replace(/_/g, ' '))
          setProgressPct(pct)
        })
        if (matches.length === 0) {
          showToast('No postcodes found — try a clearer, closer photo')
          return
        }
        newStops = matches.map((m) => ({
          id: makeId(),
          postcode: m.postcode,
          detail: '',
          status: 'pending',
        }))
      }

      setStops((prev) => [...prev, ...newStops])
      showToast(`Added ${newStops.length} stop${newStops.length === 1 ? '' : 's'}`)
    } catch (err) {
      console.error(err)
      const message = mode === 'detailed' && err.message ? err.message : 'Scan failed — try again'
      showToast(message)
    } finally {
      setScanning(false)
    }
  }

  function updateStop(updated) {
    setStops((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  function removeStop(id) {
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  function toggleDelivered(id) {
    setStops((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: s.status === 'delivered' ? 'pending' : 'delivered' }
          : s
      )
    )
  }

  function addBlankStop() {
    setStops((prev) => [
      ...prev,
      { id: makeId(), postcode: '', detail: '', status: 'pending' },
    ])
  }

  async function copyAndOpenMap(stop) {
    // e.g. "2 PO20 0TY" or "Sparrows PO10 8SP" — no comma, just space-separated.
    const address = [stop.detail, stop.postcode].filter(Boolean).join(' ')
    try {
      await navigator.clipboard.writeText(address)
      showToast('Address copied — paste into iMap search')
    } catch {
      showToast('Could not copy — copy manually: ' + address)
    }
    window.open(IMAP_URL, '_blank', 'noopener')
  }

  function handleClearRun() {
    if (stops.length === 0) return
    const ok = window.confirm('Clear all stops? This can\'t be undone.')
    if (!ok) return
    setStops([])
    clearRun()
    showToast('Run cleared')
  }

  const deliveredCount = stops.filter((s) => s.status === 'delivered').length

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          Run<span className="brand-mark">List</span>
        </span>
        {stops.length > 0 && (
          <span className="run-count">
            {deliveredCount}/{stops.length} delivered
          </span>
        )}
      </header>

      <main className="main">
        {stops.length === 0 ? (
          <ScanScreen
            onFileSelected={handleFileSelected}
            scanning={scanning}
            progressLabel={progressLabel}
            progressPct={progressPct}
            mode={scanMode}
            onModeChange={setScanMode}
          />
        ) : (
          <div className="stop-list">
            {stops.map((stop, i) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={i}
                onChange={updateStop}
                onToggleDelivered={() => toggleDelivered(stop.id)}
                onOpenMap={() => copyAndOpenMap(stop)}
                onRemove={() => removeStop(stop.id)}
              />
            ))}
            <button className="btn btn-secondary btn-block" onClick={addBlankStop}>
              + Add stop manually
            </button>
          </div>
        )}
      </main>

      {stops.length > 0 && (
        <div className="footer-bar">
          <button
            className="btn btn-secondary btn-block"
            onClick={() => document.getElementById('rescan-input')?.click()}
            disabled={scanning}
          >
            Scan more
          </button>
          <button className="btn btn-danger btn-block" onClick={handleClearRun}>
            Clear run
          </button>
          <input
            id="rescan-input"
            className="file-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelected(file, scanMode)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
