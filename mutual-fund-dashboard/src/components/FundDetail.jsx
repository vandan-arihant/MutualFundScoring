import { PARAM_METRICS, formatMetricValue } from '../lib/columns'
import { DASH, formatCompleteness, formatScore, formatWeight } from '../lib/format'
import { RatingPill, RecommendationPill, ScoreBadge } from './primitives'
import styles from './FundDetail.module.css'

/**
 * Everything the model knows about one fund.
 *
 * The table shows a chosen slice; this panel is the guarantee that no field is
 * unreachable -- identity, the composite block, the three group roll-ups, and
 * every parameter with its weight, its raw input value and the score that came
 * out. Exit-load text gets its own block because it is a sentence, not a number.
 */

function Field({ label, value, mono = false, title }) {
  return (
    <div className={styles.field}>
      <dt className={styles.fieldLabel}>{label}</dt>
      <dd className={`${styles.fieldValue} ${mono ? styles.mono : ''}`} title={title}>
        {value || value === 0 ? value : DASH}
      </dd>
    </div>
  )
}

export default function FundDetail({ row, paramColumns }) {
  const metrics = row.metrics ?? {}
  const groupScores = row.category_scores ?? {}
  const exitLoad = metrics['Exit Load Structure']

  /* Roll-ups in matrix order (Return, Risk, Cost & Operational), taken from the
     parameter order rather than from the object's own key order -- the backend
     builds category_scores from a set, so its iteration order is arbitrary. */
  const orderedGroups = []
  for (const column of paramColumns) {
    if (!orderedGroups.includes(column.group) && column.group in groupScores) {
      orderedGroups.push(column.group)
    }
  }

  return (
    <div className={styles.detail}>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h4 className={styles.cardTitle}>Fund information</h4>
          <dl className={styles.fields}>
            <Field label="Rank" value={row.rank} mono />
            <Field label="Scheme code" value={row.schcode} mono />
            <Field label="Category" value={row.category} />
            <Field label="Fund manager" value={metrics['Fund Manager']} />
            <Field
              label="Benchmark"
              value={metrics['Benchmark Name']}
              title={metrics['Benchmark Name'] || undefined}
            />
          </dl>
        </section>

        <section className={styles.card}>
          <h4 className={styles.cardTitle}>Composite assessment</h4>
          <dl className={styles.fields}>
            <Field
              label="Composite score"
              value={<strong className={styles.big}>{formatScore(row.composite)}</strong>}
              mono
            />
            <Field label="Rating" value={<RatingPill rating={row.rating} />} />
            <Field
              label="Recommendation"
              value={<RecommendationPill recommendation={row.recommendation} />}
            />
            <Field
              label="Data completeness"
              value={formatCompleteness(row.data_completeness)}
              mono
              title="Share of the weighted parameters that could be scored for this fund"
            />
          </dl>

          <div className={styles.groupScores}>
            {orderedGroups.map((group) => (
              <div className={styles.groupScore} key={group}>
                <span className={styles.groupScoreLabel}>{group}</span>
                <ScoreBadge score={groupScores[group]} size="sm" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h4 className={styles.cardTitle}>
          Parameter breakdown
          <span className={styles.cardHint}>
            raw value from the source feed, and the 1–5 band it scored
          </span>
        </h4>

        <div className={styles.paramTableWrap}>
          <table className={styles.paramTable}>
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Group</th>
                <th scope="col" className={styles.right}>
                  Weight
                </th>
                <th scope="col" className={styles.right}>
                  Value
                </th>
                <th scope="col" className={styles.center}>
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {paramColumns.map((column) => {
                const spec = PARAM_METRICS[column.key]
                const isText = spec?.format === 'text'
                const values = (spec?.keys ?? []).map((key) => ({
                  key,
                  text: formatMetricValue(metrics[key], spec.format),
                }))
                return (
                  <tr key={column.key}>
                    <th scope="row" className={styles.paramName}>
                      {column.label}
                    </th>
                    <td className={styles.paramGroup}>{column.group}</td>
                    <td className={`${styles.right} ${styles.mono}`}>{formatWeight(column.weight)}</td>
                    <td className={`${styles.right} ${styles.mono}`}>
                      {isText ? (
                        <span className={styles.textValue}>see below</span>
                      ) : (
                        values.map((entry) => (
                          <span className={styles.valueEntry} key={entry.key}>
                            {values.length > 1 ? (
                              <span className={styles.valueEntryLabel}>
                                {entry.key.replace(/^Rolling Returns /, '').replace(/ \(%\)$/, '')}
                              </span>
                            ) : null}
                            {entry.text}
                          </span>
                        ))
                      )}
                    </td>
                    <td className={styles.center}>
                      <ScoreBadge score={row.parameter_scores?.[column.key]} size="sm" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <h4 className={styles.cardTitle}>Exit load structure</h4>
        <p className={styles.exitLoad}>{exitLoad || 'Not disclosed in the source data.'}</p>
      </section>
    </div>
  )
}
