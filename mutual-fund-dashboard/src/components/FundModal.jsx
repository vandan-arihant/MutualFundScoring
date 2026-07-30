import { useCallback, useEffect, useRef } from 'react'

import { formatScore } from '../lib/format'
import FundDetail from './FundDetail'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from './icons'
import { RatingPill, RecommendationPill } from './primitives'
import styles from './FundModal.module.css'

/**
 * Full detail for one fund, in a real modal dialog.
 *
 * Built on the native <dialog> element rather than a hand-rolled overlay: it
 * gives focus trapping, inert background content, Escape-to-close and the
 * ::backdrop pseudo-element for free, all of which a div-with-fixed-position
 * would have to reimplement (usually badly).
 *
 * Left/right arrows step through the surrounding result list without closing,
 * so a ranked list can be read one fund at a time.
 */
export default function FundModal({ row, position, total, onClose, onPrev, onNext, paramColumns }) {
  const dialogRef = useRef(null)
  const bodyRef = useRef(null)

  /* Open the dialog imperatively -- <dialog>'s declarative `open` attribute
     renders it non-modal, without the backdrop or the focus trap. */
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    if (!dialog.open) dialog.showModal()

    /* The browser fires `cancel` for Escape; route it through onClose so React
       state stays the single source of truth for what's open. */
    const onCancel = (event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  /* Scroll back to the top when stepping to another fund, otherwise the reader
     lands part-way down the next fund's parameter table. */
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [row.schcode])

  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'ArrowLeft' && onPrev) {
        event.preventDefault()
        onPrev()
      }
      if (event.key === 'ArrowRight' && onNext) {
        event.preventDefault()
        onNext()
      }
    },
    [onPrev, onNext],
  )

  /* Clicking the backdrop closes. The panel covers the rest of the dialog box,
     so a click landing on <dialog> itself was outside the panel. */
  const onDialogClick = (event) => {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={onDialogClick}
      onKeyDown={onKeyDown}
      aria-labelledby="fund-modal-title"
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headline}>
            <span className={styles.rank}>Rank {row.rank}</span>
            <h2 className={styles.title} id="fund-modal-title">
              {row.fund}
            </h2>
            <div className={styles.subline}>
              <span className={styles.category}>{row.category}</span>
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.schcode}>#{row.schcode}</span>
              <RatingPill rating={row.rating} />
              <RecommendationPill recommendation={row.recommendation} />
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.scoreBlock}>
              <span className={styles.scoreValue}>{formatScore(row.composite)}</span>
              <span className={styles.scoreLabel}>composite / 5</span>
            </div>

            <div className={styles.nav}>
              <button
                type="button"
                className={styles.navButton}
                onClick={onPrev}
                disabled={!onPrev}
                aria-label="Previous fund"
                title="Previous fund (left arrow)"
              >
                <ChevronLeftIcon width={18} height={18} />
              </button>
              <span className={styles.navCount}>
                {position} / {total}
              </span>
              <button
                type="button"
                className={styles.navButton}
                onClick={onNext}
                disabled={!onNext}
                aria-label="Next fund"
                title="Next fund (right arrow)"
              >
                <ChevronRightIcon width={18} height={18} />
              </button>
            </div>

            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label="Close"
              title="Close (Esc)"
            >
              <CloseIcon width={20} height={20} />
            </button>
          </div>
        </header>

        <div className={styles.body} ref={bodyRef}>
          <FundDetail row={row} paramColumns={paramColumns} />
        </div>

        <footer className={styles.footer}>
          <span>
            <kbd className={styles.kbd}>&larr;</kbd> <kbd className={styles.kbd}>&rarr;</kbd> browse
            funds
          </span>
          <span>
            <kbd className={styles.kbd}>Esc</kbd> close
          </span>
        </footer>
      </div>
    </dialog>
  )
}
