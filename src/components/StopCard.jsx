export default function StopCard({ stop, index, onChange, onToggleDelivered, onOpenMap, onRemove }) {
  const delivered = stop.status === 'delivered'

  return (
    <div className={`stop-card${delivered ? ' delivered' : ''}`}>
      {delivered && <span className="delivered-stamp">Delivered</span>}
      <div className="stop-card-top">
        <span className="stop-seq">{String(index + 1).padStart(2, '0')}</span>
        <div className="stop-fields">
          <input
            className="stop-postcode"
            value={stop.postcode}
            onChange={(e) => onChange({ ...stop, postcode: e.target.value.toUpperCase() })}
            placeholder="POSTCODE"
            aria-label={`Postcode for stop ${index + 1}`}
            autoCapitalize="characters"
          />
          <input
            className="stop-detail"
            value={stop.detail}
            onChange={(e) => onChange({ ...stop, detail: e.target.value })}
            placeholder="House number / name"
            aria-label={`House number or name for stop ${index + 1}`}
          />
        </div>
        <button
          className="stop-remove"
          onClick={onRemove}
          aria-label={`Remove stop ${index + 1}`}
        >
          ×
        </button>
      </div>

      <div className="stop-actions">
        <button className="btn btn-secondary" onClick={onOpenMap}>
          Copy &amp; open iMap
        </button>
        <button
          className={delivered ? 'btn btn-secondary' : 'btn btn-primary'}
          onClick={onToggleDelivered}
        >
          {delivered ? 'Undo delivered' : 'Mark delivered'}
        </button>
      </div>
    </div>
  )
}
