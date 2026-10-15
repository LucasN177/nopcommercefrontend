import { useState, useSyncExternalStore } from 'react'
import { clearRequestLog, getRequestLog, getToken, onRequestLog, type RequestLogEntry } from '../api/client'

let version = 0
const subscribe = (listener: () => void) =>
  onRequestLog(() => {
    version++
    listener()
  })

function Entry({ entry }: { entry: RequestLogEntry }) {
  const [open, setOpen] = useState(false)
  const statusClass = entry.status >= 400 ? 'bad' : entry.status >= 300 ? 'warn' : 'ok'
  return (
    <li>
      <button className="log-line" onClick={() => setOpen(!open)}>
        <span className={`log-status ${statusClass}`}>{entry.status}</span>
        <span className="log-method">{entry.method}</span>
        <span className="log-url">{entry.url.replace(/^\/api\/headless\/v1/, '')}</span>
        <span className="log-time">{entry.durationMs} ms</span>
      </button>
      {open && (
        <div className="log-detail">
          {entry.requestBody !== undefined && (
            <>
              <h5>Request</h5>
              <pre>{JSON.stringify(entry.requestBody, null, 2)}</pre>
            </>
          )}
          <h5>Response</h5>
          <pre>{entry.responseBody === undefined ? '(leer)' : JSON.stringify(entry.responseBody, null, 2)}</pre>
        </div>
      )}
    </li>
  )
}

/** Panel listing the API calls of this session, to see what the frontend sends and gets. */
export default function ApiLog() {
  const [open, setOpen] = useState(false)
  useSyncExternalStore(subscribe, () => version)
  const log = getRequestLog()
  const token = getToken()
  const errors = log.filter(e => e.status >= 400).length

  return (
    <div className={`apilog ${open ? 'open' : ''}`}>
      <button className="apilog-toggle" onClick={() => setOpen(!open)}>
        API-Log ({log.length}){errors > 0 && <span className="badge-bad">{errors}</span>}
      </button>
      {open && (
        <div className="apilog-panel">
          <div className="apilog-head">
            <span className="small">
              Kunde: {token ? `${token.customerGuid.slice(0, 8)}… (${token.isRegistered ? 'registriert' : 'Gast'}), Token bis ${new Date(token.expiresOnUtc).toLocaleDateString()}` : 'kein Token'}
            </span>
            <button className="link" onClick={clearRequestLog}>Leeren</button>
          </div>
          <ul>{log.map(entry => <Entry key={entry.id} entry={entry} />)}</ul>
        </div>
      )}
    </div>
  )
}
