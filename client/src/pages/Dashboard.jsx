import { useState, useEffect } from 'react'
import './Dashboard.css'

function Dashboard() {
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchToday()
  }, [])

  async function fetchToday() {
    try {
      const res = await fetch('/api/assignments/today', { credentials: 'include' })

      if (res.status === 404) {
        setPlayer(null)
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load today\'s assignment')
      }

      const data = await res.json()
      setPlayer(data.player)
    } catch (err) {
      setError('Could not load your assignment. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim() {
    setClaiming(true)
    setError(null)

    try {
      const res = await fetch('/api/assignments/claim', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Could not claim a hitter. Please try again.')
        return
      }

      setPlayer(data.player)
    } catch (err) {
      setError('Unable to connect. Please try again.')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      {!player && (
        <div className="claim-prompt">
          <h2>No hitter claimed yet today</h2>
          <p className="text-muted">Click below to get your random assignment for today's slate.</p>
          <button className="claim-btn" onClick={handleClaim} disabled={claiming}>
            {claiming ? 'Claiming...' : 'Claim Your Hitter'}
          </button>
          {error && <p className="dashboard-error">{error}</p>}
        </div>
      )}

      {player && (
        <div className="player-card">
          <img
            src={player.headshot_url}
            alt={player.name}
            className="player-headshot"
          />
          <div className="player-info">
            <h2 className="player-name">{player.name}</h2>
            <p className="player-meta">
              {player.team_name || player.team} · {player.team_abbr} · {player.position}
            </p>
          </div>
        </div>
      )}

      {error && player && <p className="dashboard-error">{error}</p>}
    </div>
  )
}

export default Dashboard