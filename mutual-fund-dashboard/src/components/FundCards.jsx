import { metricSummary } from '../lib/columns'
import { DASH } from '../lib/format'
import { ChevronRightIcon } from './icons'
import { CompositeScore, RatingPill, ScoreBadge } from './primitives'
import styles from './FundCards.module.css'

/**
 * The phone view. Not a squeezed table -- an 18-column grid cannot be made
 * usable at 390px, so each fund becomes a card: identity and verdict up front,
 * the nine parameter scores as a compact grid, and the same FundModal on tap.
 * Every field stays reachable.
 */

const STAGGER_STEP_MS = 28
const STAGGER_CAP_MS = 320

/* Parameters whose raw figure is worth the space on a phone. */
const HIGHLIGHT_KEYS = ['alpha_3y', 'sharpe_3y', 'aum_size_category_adjusted']

export default function FundCards({ rows, paramColumns, selectedId, onSelect }) {
  return (
    <ul className={styles.list}>
      {rows.map((row, index) => (
        <li
          className={styles.item}
          key={row.schcode}
          style={{ animationDelay: `${Math.min(index * STAGGER_STEP_MS, STAGGER_CAP_MS)}ms` }}
        >
          <article
            className={`${styles.card} ${row.schcode === selectedId ? styles.cardSelected : ''}`}
          >
            <button type="button" className={styles.summary} onClick={() => onSelect(row)}>
              <span className={styles.rankBadge}>{row.rank}</span>

              <span className={styles.headline}>
                <span className={styles.fundName}>{row.fund}</span>
                <span className={styles.metaLine}>
                  <span className={styles.category}>{row.category || DASH}</span>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.schcode}>#{row.schcode}</span>
                </span>
                <span className={styles.pills}>
                  <RatingPill rating={row.rating} />
                  <span className={styles.recommendation}>{row.recommendation}</span>
                </span>
              </span>

              <span className={styles.trailing}>
                <CompositeScore value={row.composite} />
                <span className={styles.chevron} aria-hidden="true">
                  <ChevronRightIcon width={18} height={18} />
                </span>
              </span>
            </button>

            <dl className={styles.scoreGrid}>
              {paramColumns.map((column) => (
                <div className={styles.scoreCell} key={column.key}>
                  <dt className={styles.scoreLabel} title={column.label}>
                    {column.label}
                  </dt>
                  <dd className={styles.scoreValue}>
                    <ScoreBadge score={row.parameter_scores?.[column.key]} size="sm" />
                    {HIGHLIGHT_KEYS.includes(column.key) ? (
                      <span className={styles.rawValue}>{metricSummary(row, column.key)}</span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        </li>
      ))}
    </ul>
  )
}
