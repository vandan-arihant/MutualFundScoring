import { RATING_TONES, RECOMMENDATION_TONES, scoreTone } from '../lib/columns'
import { DASH, formatScore } from '../lib/format'
import styles from './primitives.module.css'

/**
 * Small shared display primitives. Kept together because each is a handful of
 * lines and they share one stylesheet of tone tokens.
 */

/** A 1-5 parameter score, tinted by band. */
export function ScoreBadge({ score, size = 'md' }) {
  const tone = scoreTone(score)
  if (!tone) {
    return (
      <span className={`${styles.badge} ${styles.tone0} ${styles[size]}`} title="Not scored">
        {DASH}
      </span>
    )
  }
  return (
    <span
      className={`${styles.badge} ${styles[`tone${tone}`]} ${styles[size]}`}
      title={`Score ${formatScore(score)} of 5`}
    >
      {formatScore(score)}
    </span>
  )
}

/** The composite score, rendered larger and with a 0-5 progress track. */
export function CompositeScore({ value }) {
  const tone = scoreTone(value)
  const pct = value === null || value === undefined ? 0 : (Number(value) / 5) * 100
  return (
    <div className={styles.composite}>
      <span className={`${styles.compositeValue} ${styles[`toneText${tone}`]}`}>
        {formatScore(value)}
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={`${styles.trackFill} ${styles[`toneFill${tone}`]}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  )
}

export function RatingPill({ rating }) {
  const tone = RATING_TONES[rating] ?? 0
  return <span className={`${styles.pill} ${styles[`tone${tone}`]}`}>{rating || DASH}</span>
}

export function RecommendationPill({ recommendation }) {
  const tone = RECOMMENDATION_TONES[recommendation] ?? 0
  return (
    <span className={`${styles.pill} ${styles.pillQuiet} ${styles[`toneText${tone}`]}`}>
      {recommendation || DASH}
    </span>
  )
}

/** Data-completeness meter: 100% is the norm here, so anything less should show. */
export function CompletenessMeter({ value }) {
  if (value === null || value === undefined) return <span>{DASH}</span>
  const pct = Math.round(Number(value) * 100)
  return (
    <span className={styles.completeness} title={`${pct}% of the weighted parameters scored`}>
      <span className={styles.completenessTrack} aria-hidden="true">
        <span className={styles.completenessFill} style={{ width: `${pct}%` }} />
      </span>
      <span className={styles.completenessLabel}>{pct}%</span>
    </span>
  )
}

/**
 * A colour swatch for a tone, with no number in it.
 *
 * Used where the tone is a legend rather than a measurement -- a ScoreBadge here
 * would print "5.00" next to "Outstanding" and read as that band's score.
 */
export function ToneDot({ tone, label }) {
  return <span className={`${styles.dot} ${styles[`tone${tone}`]}`} role="presentation" title={label} />
}

export function Badge({ children, tone = 'neutral', title }) {
  return (
    <span className={`${styles.tag} ${styles[`tag${tone}`]}`} title={title}>
      {children}
    </span>
  )
}

export function Spinner({ label = 'Loading' }) {
  return <span className={styles.spinner} role="status" aria-label={label} />
}

export function Skeleton({ width = '100%', height = '0.875rem' }) {
  return <span className={styles.skeleton} style={{ width, height }} aria-hidden="true" />
}

/** Placeholder rows so the layout doesn't jump when real data lands. */
export function TableSkeleton({ rows = 12, columns = 10 }) {
  return (
    <div className={styles.skeletonTable} aria-busy="true" aria-label="Loading funds">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className={styles.skeletonRow} key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <Skeleton key={colIndex} width={colIndex === 1 ? '18rem' : '3.5rem'} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, description, action }) {
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description ? <p className={styles.emptyText}>{description}</p> : null}
      {action}
    </div>
  )
}
