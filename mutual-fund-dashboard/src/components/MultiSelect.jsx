import { useEffect, useId, useRef, useState } from 'react'

import { CheckIcon, ChevronDownIcon } from './icons'
import styles from './MultiSelect.module.css'

/**
 * A checkbox dropdown. Native <select multiple> is unusable for this (no clear
 * affordance, ctrl-click to deselect, awful on touch), and a real listbox needs
 * outside-click and Escape handling anyway.
 */
export default function MultiSelect({ label, options, selected, onChange, allLabel = 'All' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        containerRef.current?.querySelector('button')?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])
  }

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`

  return (
    <div className={styles.wrap} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${selected.length ? styles.triggerActive : ''}`}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.triggerLabel}>{label}</span>
        <span className={styles.triggerValue}>{summary}</span>
        <ChevronDownIcon width={14} height={14} className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      {open ? (
        <div className={styles.panel} id={listId} role="group" aria-label={label}>
          <div className={styles.panelHeader}>
            <span className={styles.panelCount}>
              {selected.length}/{options.length}
            </span>
            <button
              type="button"
              className={styles.clear}
              onClick={() => onChange([])}
              disabled={selected.length === 0}
            >
              Clear
            </button>
          </div>

          <ul className={styles.options}>
            {options.map((option) => {
              const isSelected = selected.includes(option)
              return (
                <li key={option}>
                  <label className={styles.option}>
                    <input
                      type="checkbox"
                      className={styles.checkboxInput}
                      checked={isSelected}
                      onChange={() => toggle(option)}
                    />
                    <span className={`${styles.checkbox} ${isSelected ? styles.checkboxOn : ''}`} aria-hidden="true">
                      {isSelected ? <CheckIcon width={11} height={11} /> : null}
                    </span>
                    <span className={styles.optionLabel}>{option}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
