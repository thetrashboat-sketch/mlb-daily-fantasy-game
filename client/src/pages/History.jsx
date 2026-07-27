import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './History.css'

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'points_desc', label: 'Highest Points' },
  { value: 'points_asc', label: 'Lowest Points' },
]

const APP_START_YEAR = 2026

function History() {
  const { userId } = useParams()
  const [history, setHistory] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [season, setSeason] = useState('')
  const [sort, setSort] = useState('date_desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchHistory()
  }, [userId, season, sort, page])

  async function fetchHistory() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sort, page })
      if (season) params.set('season', season)

      const res = await fetch(`/api/users/${userId}/history?${params}`, {
        credentials: 'include',
      })

      if (!res.ok) throw new Error('Failed to load history')

      const data = await res.json()
      setHistory(data.history)
      setTotal(data.total)
      setPageSize(data.pageSize)
      setError(null)
    } catch (err) {
      setError('Could not load history. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  function handleSeasonChange(e) {
    setSeason(e.target.value)
    setPage(1)
  }

  function handleSortChange(e) {
    setSort(e.target.value)
    setPage(1)
  }

  function pointsClass(points) {
    if (points > 0) return 'history-row-points positive'
    if (points < 0) return 'history-row-points negative'
    return 'history-row-points'
  }


  function getSeasonOptions() {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let year = currentYear; year >= APP_START_YEAR; year--) {
        years.push(year)
    }
    return years
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="history-page">
      <div className="history-card">
        <h1 className="history-title">Stats History</h1>

        <div className="history-filters">
          <select
            className="history-filter-select"
            value={season}
            onChange={handleSeasonChange}
          >
            <option value="">All Seasons</option>
            {getSeasonOptions().map(year => (
                <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            className="history-filter-select"
            value={sort}
            onChange={handleSortChange}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading && <p className="text-muted">Loading...</p>}
        {error && <p className="history-error">{error}</p>}

        {!loading && !error && history.length === 0 && (
          <p className="text-muted history-placeholder">
            No history found for these filters.
          </p>
        )}

        {!loading && !error && history.length > 0 && (
          <>
            <ul className="history-list">
              {history.map(row => (
                <li key={row.assignment_id} className="history-row">
                  <div className="history-row-main">
                    <span className="history-row-date">
                      {new Date(row.assigned_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="history-row-player">
                      {row.player_name} <span className="history-row-team">({row.team_abbr})</span>
                    </span>
                    <span className={pointsClass(row.fantasy_points)}>{row.fantasy_points} pts</span>
                  </div>

                  {row.multiplier_applied > 1 && (
                    <p className="history-row-multiplier">Multiplier applied: ×{row.multiplier_applied}</p>
                  )}

                  {row.stat_summary && (
                    <p className="history-row-summary">{row.stat_summary}</p>
                  )}

                  {row.achievements.length > 0 && (
                    <div className="history-row-achievements">
                      {row.achievements.map(a => (
                        <span
                          key={a.key}
                          className={`achievement-badge rarity-${a.rarity.toLowerCase()}`}
                        >
                          {a.name}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <div className="history-pagination">
              <button
                className="history-page-btn"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="history-page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                className="history-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default History