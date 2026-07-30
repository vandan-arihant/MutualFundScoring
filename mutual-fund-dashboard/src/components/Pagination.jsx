import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import styles from './Pagination.module.css'

const PAGE_SIZES = [25, 50, 100, 250]

/**
 * Pages rather than virtual scrolling: ~1,400 rows is small enough that paging
 * keeps the DOM light without the complexity (and broken Ctrl-F, broken sticky
 * headers, broken print) that a windowed list would bring.
 */
export default function Pagination({ page, pageSize, totalRows, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const from = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalRows)

  const pages = pageWindow(page, totalPages)

  return (
    <div className={styles.bar}>
      <p className={styles.count}>
        {totalRows === 0 ? (
          'No funds match the current filters'
        ) : (
          <>
            Showing <strong>{from.toLocaleString('en-IN')}</strong>–
            <strong>{to.toLocaleString('en-IN')}</strong> of{' '}
            <strong>{totalRows.toLocaleString('en-IN')}</strong> funds
          </>
        )}
      </p>

      <div className={styles.controls}>
        <label className={styles.pageSize}>
          <span className={styles.pageSizeLabel}>Rows</span>
          <select
            className={styles.select}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <nav className={styles.pager} aria-label="Pagination">
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>

          {pages.map((entry, index) =>
            entry === null ? (
              <span className={styles.ellipsis} key={`gap-${index}`}>
                …
              </span>
            ) : (
              <button
                type="button"
                key={entry}
                className={`${styles.pageButton} ${entry === page ? styles.pageButtonActive : ''}`}
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            className={styles.pageButton}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </nav>
      </div>
    </div>
  )
}

/** First, last, and a window around the current page; `null` marks a gap. */
function pageWindow(page, totalPages, span = 1) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages, page])
  for (let offset = 1; offset <= span; offset += 1) {
    if (page - offset > 1) pages.add(page - offset)
    if (page + offset < totalPages) pages.add(page + offset)
  }

  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b)
  const result = []
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push(null)
    result.push(value)
    previous = value
  }
  return result
}
