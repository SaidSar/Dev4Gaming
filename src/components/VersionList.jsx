// Versiones del juego agrupadas por número de versión, con métricas por
// plataforma. Publicar/archivar por versión completa o por plataforma.
import { PLATFORM_LABEL, PLATFORM_ORDER } from '../utils/builds'

const STATUS_LABEL = {
  pending_review: 'Pendiente',
  published:      'Publicada',
  archived:       'Archivada',
}

function percent(value) {
  return value == null ? '—' : `${Math.round(value * 100)} %`
}

/** Agrupa las filas de get_build_metrics (ya vienen recientes primero) */
function groupByVersion(metrics) {
  const groups = []
  const byVersion = new Map()
  for (const m of metrics) {
    if (!byVersion.has(m.version)) {
      const group = { version: m.version, rows: [] }
      byVersion.set(m.version, group)
      groups.push(group)
    }
    byVersion.get(m.version).rows.push(m)
  }
  for (const g of groups) {
    g.rows.sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform))
    const statuses = new Set(g.rows.map(r => r.status))
    g.status = statuses.size === 1 ? [...statuses][0] : 'mixed'
  }
  return groups
}

function VersionList({ metrics, busyKey, onVersionStatus, onBuildStatus }) {
  if (!metrics.length) {
    return <p className="dev-dashboard__muted">Todavía no subes versiones de este juego.</p>
  }

  return (
    <ul className="dev-versions">
      {groupByVersion(metrics).map(group => {
        const vBusy = busyKey === `v:${group.version}`
        return (
          <li key={group.version} className="dev-version card">
            <div className="dev-version__head">
              <strong className="dev-version__name">v{group.version}</strong>
              <span className={`dev-version__status dev-version__status--${group.status}`}>
                {group.status === 'mixed' ? 'Mixta' : STATUS_LABEL[group.status]}
              </span>
            </div>

            <div className="dev-version__actions">
              {group.status !== 'published' && (
                <button type="button" className="btn btn-primary" disabled={vBusy}
                  onClick={() => onVersionStatus(group.version, 'published')}>
                  Publicar versión
                </button>
              )}
              {group.status !== 'archived' && (
                <button type="button" className="btn btn-secondary" disabled={vBusy}
                  onClick={() => onVersionStatus(group.version, 'archived')}>
                  Archivar versión
                </button>
              )}
            </div>

            <ul className="dev-version__platforms">
              {group.rows.map(m => {
                const bBusy = vBusy || busyKey === `b:${m.build_id}`
                return (
                  <li key={m.build_id} className="dev-version__platform">
                    <div className="dev-version__platform-head">
                      <span className="dev-version__platform-name">{PLATFORM_LABEL[m.platform]}</span>
                      <span className={`dev-version__status dev-version__status--${m.status}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                      <span className="dev-version__platform-actions">
                        {m.status !== 'published' && (
                          <button type="button" className="dev-link-btn" disabled={bBusy}
                            onClick={() => onBuildStatus(m.build_id, 'published')}>
                            Publicar
                          </button>
                        )}
                        {m.status !== 'archived' && (
                          <button type="button" className="dev-link-btn" disabled={bBusy}
                            onClick={() => onBuildStatus(m.build_id, 'archived')}>
                            Archivar
                          </button>
                        )}
                      </span>
                    </div>

                    <dl className="dev-version__metrics">
                      <div><dt>Descargas</dt><dd>{m.downloads}<small> ({m.downloaders} usuarios)</small></dd></div>
                      <div><dt>Rating</dt><dd>{m.avg_rating != null ? `${Number(m.avg_rating).toFixed(1)} ★` : '—'}<small> ({m.reviews})</small></dd></div>
                      <div><dt>Descarga → reseña</dt><dd>{percent(m.download_to_review)}</dd></div>
                      <div>
                        <dt>Bugs</dt>
                        <dd className="dev-version__bugs">
                          <span className="sev sev--crash">{m.bugs_crash} crash</span>
                          <span className="sev sev--high">{m.bugs_high} alta</span>
                          <span className="sev">{m.bugs_medium} media</span>
                          <span className="sev">{m.bugs_low} baja</span>
                        </dd>
                      </div>
                    </dl>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

export default VersionList
