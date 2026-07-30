import { useEffect, useRef } from 'react'

import { FUND_INFO_GROUP } from '../lib/fundsView'
import { CloseIcon, DownloadIcon, LayersIcon, SearchIcon, SparkIcon } from './icons'
import MultiSelect from './MultiSelect'
import styles from './Toolbar.module.css'

const VIEW_MODES = [
  { id: 'scores', label: 'Scores', hint: 'Show the 1–5 band each parameter scored' },
  { id: 'values', label: 'Values', hint: 'Show the raw figure each score came from' },
  { id: 'both', label: 'Both', hint: 'Score with its raw value underneath' },
]

export default function Toolbar({
  query,
  onQueryChange,
  categories,
  selectedCategories,
  onCategoriesChange,
  ratings,
  selectedRatings,
  onRatingsChange,
  minComposite,
  onMinCompositeChange,
  viewMode,
  onViewModeChange,
  groups,
  visibleGroups,
  onToggleGroup,
  presets,
  activePresetId,
  onApplyPreset,
  onExport,
  onReset,
  hasActiveFilters,
  resultCount,
  isCompact,
}) {
  const searchRef = useRef(null)

  /* "/" to search is the convention for data-dense tools; Escape clears. */
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const typingElsewhere =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)

      if (event.key === '/' && !typingElsewhere) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        onQueryChange('')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onQueryChange])

  const allGroups = [FUND_INFO_GROUP, ...groups]

  return (
    <div className={styles.toolbar}>
      <div className={styles.searchRow}>
        <div className={styles.search}>
          <SearchIcon width={18} height={18} className={styles.searchIcon} />
          <input
            ref={searchRef}
            type="search"
            className={styles.searchInput}
            placeholder="Search fund, manager, benchmark or scheme code…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Search funds"
          />
          {query ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
            >
              <CloseIcon width={16} height={16} />
            </button>
          ) : (
            <kbd className={styles.kbd}>/</kbd>
          )}
        </div>

        <div className={styles.rowActions}>
          <button
            type="button"
            className={styles.button}
            onClick={onExport}
            disabled={resultCount === 0}
          >
            <DownloadIcon width={16} height={16} />
            <span className={styles.buttonText}>Export CSV</span>
          </button>
          {hasActiveFilters ? (
            <button type="button" className={styles.buttonGhost} onClick={onReset}>
              <CloseIcon width={14} height={14} />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.filterRow}>
        <MultiSelect
          label="Category"
          options={categories}
          selected={selectedCategories}
          onChange={onCategoriesChange}
          allLabel="All categories"
        />

        <MultiSelect
          label="Rating"
          options={ratings}
          selected={selectedRatings}
          onChange={onRatingsChange}
          allLabel="All ratings"
        />

        <label className={styles.slider}>
          <span className={styles.sliderLabel}>Min score</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.25"
            value={minComposite}
            onChange={(event) => onMinCompositeChange(Number(event.target.value))}
            className={styles.range}
            style={{ '--fill': `${(minComposite / 5) * 100}%` }}
          />
          <output className={styles.sliderValue}>
            {minComposite === 0 ? 'any' : minComposite.toFixed(2)}
          </output>
        </label>

        <div className={styles.presets}>
          <SparkIcon width={15} height={15} className={styles.presetIcon} />
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`${styles.preset} ${
                activePresetId === preset.id ? styles.presetActive : ''
              }`}
              onClick={() => onApplyPreset(preset)}
              aria-pressed={activePresetId === preset.id}
              title={preset.hint}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.displayRow}>
        <div className={styles.segmented} role="group" aria-label="Parameter display">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`${styles.segment} ${viewMode === mode.id ? styles.segmentActive : ''}`}
              onClick={() => onViewModeChange(mode.id)}
              title={mode.hint}
              aria-pressed={viewMode === mode.id}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {!isCompact ? (
          <div className={styles.groupToggles}>
            <LayersIcon width={15} height={15} className={styles.groupIcon} />
            <span className={styles.groupCaption}>Columns</span>
            {allGroups.map((group) => {
              const active = visibleGroups.includes(group)
              return (
                <button
                  key={group}
                  type="button"
                  className={`${styles.chip} ${active ? styles.chipActive : ''}`}
                  onClick={() => onToggleGroup(group)}
                  aria-pressed={active}
                  title={`${active ? 'Hide' : 'Show'} the ${group} columns`}
                >
                  {group}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
