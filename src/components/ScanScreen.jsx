import { useRef } from 'react'

export default function ScanScreen({ onFileSelected, scanning, progressLabel, progressPct, mode, onModeChange }) {
  const inputRef = useRef(null)

  return (
    <div className="scan-screen">
      {!scanning ? (
        <>
          <div className="scan-target" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2" strokeLinecap="round" />
              <rect x="8" y="9" width="8" height="6" rx="1" />
            </svg>
          </div>
          <h1>Scan a drop sheet</h1>
          <p>
            {mode === 'quick'
              ? 'Point your camera at a simple postcode list. They\u2019ll load in the order they appear.'
              : 'Handles messier sheets \u2014 multiple fields, checkboxes, mixed layouts. Needs an internet connection.'}
          </p>

          <div className="scan-mode-toggle" role="radiogroup" aria-label="Scan mode">
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'quick'}
              className={`scan-mode-btn${mode === 'quick' ? ' active' : ''}`}
              onClick={() => onModeChange('quick')}
            >
              Quick scan
              <span className="scan-mode-sub">Free &middot; offline</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'detailed'}
              className={`scan-mode-btn${mode === 'detailed' ? ' active' : ''}`}
              onClick={() => onModeChange('detailed')}
            >
              Detailed scan
              <span className="scan-mode-sub">Handles messy sheets</span>
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            Take photo
          </button>
          <input
            ref={inputRef}
            className="file-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelected(file, mode)
              e.target.value = ''
            }}
          />
        </>
      ) : (
        <>
          <h1>Reading drop sheet…</h1>
          <div className="scan-progress">
            <div className="scan-progress-track">
              <div className="scan-progress-fill" style={{ width: `${Math.round(progressPct * 100)}%` }} />
            </div>
            <span className="scan-progress-label">{progressLabel}</span>
          </div>
        </>
      )}
    </div>
  )
}
