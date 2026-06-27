import { useState, useEffect } from 'react'
import StatBox from '../components/StatBox.jsx'
import './Dashboard.css'
 
function Dashboard() {
  const [player, setPlayer] = useState(null)
  const [todayStats, setTodayStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState(null)
  const [seasonStats, setSeasonStats] = useState(null)
  const [newsItems, setNewsItems] = useState(null)
 
  useEffect(() => {
    fetchToday()
  }, [])
 
  useEffect(() => {
    if (player) {
      fetchTodayStats()
    }
  }, [player])
 
  useEffect(() => {
    fetchNews()
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
      setSeasonStats(data.season_stats)
    } catch (err) {
      setError('Could not load your assignment. Please refresh.')
    } finally {
      setLoading(false)
    }
  }
 
  async function fetchTodayStats() {
    try {
      const res = await fetch('/api/assignments/today/stats', { credentials: 'include' })
 
      if (res.status === 404) {
        setTodayStats(null)
        return
      }
 
      if (!res.ok) {
        throw new Error('Failed to load today\'s stats')
      }
 
      const data = await res.json()
      setTodayStats(data.stats)
    } catch (err) {
        setTodayStats(null)
    }
}
 
async function fetchNews() {
  try {
    const res = await fetch('/api/news', { credentials: 'include' })
 
    if (!res.ok) {
      throw new Error('Failed to load news')
    }
 
    const data = await res.json()
    setNewsItems(data.news.items)
  } catch (err) {
    setNewsItems(null)
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
        <>
          <p className="pick-label">Today's assignment</p>
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
        </>
      )}
 
      {player && (
        <>
          <p className="grid-label">Today</p>
          {todayStats ? (
            <StatBox stats={[
              { label: 'AB', value: todayStats.ab },
              { label: 'H', value: todayStats.h },
              { label: 'HR', value: todayStats.hr },
              { label: 'RBI', value: todayStats.rbi },
              { label: 'R', value: todayStats.r },
              { label: 'AVG', value: todayStats.avg },
            ]} />
          ) : (
            <div className="stat-placeholder">No Stats Yet</div>
          )}
        </>
      )}
 
      {player && (
        <>
          <p className="grid-label">Season — {new Date().getFullYear()}</p>
          {seasonStats ? (
            <StatBox stats={[
              { label: 'AB', value: seasonStats.ab },
              { label: 'H', value: seasonStats.h },
              { label: 'HR', value: seasonStats.hr },
              { label: 'RBI', value: seasonStats.rbi },
              { label: 'R', value: seasonStats.r },
              { label: 'OPS', value: seasonStats.ops },
            ]} />
          ) : (
            <div className="stat-placeholder">No stats yet</div>
          )}
        </>
      )}
 
      <p className="section-title"> MLB News</p>
      {newsItems && newsItems.length > 0 ? (
        <div className="news-list">
          {newsItems.map(item => (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
              key={item.link}
            >
              <img src={item.image} alt="" className="news-thumbnail" />
              <div className="news-text">
                <span className="news-title">{item.title}</span>
                <span className="news-source">MLB.com</span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="stat-placeholder">No news available</div>
      )}
 
      {error && player && <p className="dashboard-error">{error}</p>}
    </div>
  )
}
 
export default Dashboard