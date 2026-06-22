import { useState, useEffect } from 'react'
import './Leaderboard.css'

const PAGE_SIZE = 10

function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard', { credentials: 'include' })

      if (!res.ok) {
        throw new Error('Failed to load leaderboard')
      }

      const data = await res.json()
      setEntries(data.leaderboard)
    } catch (err) {
      setError('Could not load the leaderboard. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE)
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) {
    return (
      <div className="leaderboard-page">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      <h1 className="leaderboard-title">Leaderboard</h1>

      {error && <p className="leaderboard-error">{error}</p>}

      {!error && (
        <>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Season Points</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry) => (
                <tr key={entry.user_id}>
                  <td className="rank-cell">{entry.rank}</td>
                  <td>{entry.username}</td>
                  <td className="points-cell">{entry.season_total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </button>
              <span className="page-indicator">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Leaderboard