import { formatDateTime } from '../lib/format'
import { AlertIcon, RefreshIcon } from './icons'
import styles from './Banner.module.css'

/**
 * Two distinct failure modes, deliberately worded differently:
 *
 *  - `connection`: the browser can't reach the API. Nothing on screen is
 *    trustworthy beyond what was already loaded.
 *  - `staleData`: the API is fine, but its own scheduled refresh failed. The
 *    table below is real, just older than it should be -- so this is a warning,
 *    not an error, and it says when the data is actually from.
 */
export default function Banner({ tone = 'danger', title, message, detail, onRetry, retryLabel = 'Retry' }) {
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <AlertIcon width={16} height={16} className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {message ? <p className={styles.message}>{message}</p> : null}
        {detail ? <p className={styles.detail}>{detail}</p> : null}
      </div>
      {onRetry ? (
        <button type="button" className={styles.action} onClick={onRetry}>
          <RefreshIcon width={13} height={13} />
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export function ConnectionBanner({ error, onRetry, hasCachedRows }) {
  return (
    <Banner
      tone="danger"
      title="Can’t reach the scoring API"
      message={error?.message}
      detail={
        hasCachedRows
          ? 'The table below is the last data this page managed to load.'
          : 'Start it with:  uvicorn api:app --port 8000 --app-dir EquityMFScoringModel/code\n' +
            'If it is already running, add this page’s origin to EXTRA_CORS_ORIGINS in .env.'
      }
      onRetry={onRetry}
    />
  )
}

export function StaleDataBanner({ serverError, lastUpdated, onRetry }) {
  return (
    <Banner
      tone="warn"
      title="The scores below are stale — the last scheduled refresh failed"
      message={`Showing data from ${formatDateTime(lastUpdated)}.`}
      detail={serverError}
      onRetry={onRetry}
      retryLabel="Try again"
    />
  )
}
