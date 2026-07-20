import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Profile.css'

const DISCORD_MESSAGES = {
  linked: { text: '✅ Discord linked successfully!', type: 'success' },
  denied: { text: 'Discord linking was cancelled.', type: 'info' },
  error: { text: 'Something went wrong linking Discord. Please try again.', type: 'error' },
}

function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [achievements, setAchievements] = useState([])

  const discordParam = searchParams.get('discord')
  const discordMessage = discordParam ? DISCORD_MESSAGES[discordParam] : null

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (discordParam) {
      const timeout = setTimeout(() => {
        searchParams.delete('discord')
        setSearchParams(searchParams, { replace: true })
      }, 4000)
      return () => clearTimeout(timeout)
    }
  }, [discordParam])

  useEffect(() => {
    fetchProfile()
    fetchAchievements()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' })

      if (!res.ok) {
        throw new Error('Failed to load profile')
      }

      const data = await res.json()
      setProfile(data)
    } catch (err) {
      setError('Could not load your profile. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAchievements() {
    try {
      const res = await fetch('/api/achievements/mine', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load achievements')
      const data = await res.json()
      setAchievements(data.achievements)
    } catch (err) {
      setAchievements([])
    }
  }

  function handleLinkDiscord() {
    window.location.href = '/api/discord/auth'
  }

  if (loading) {
    return (
      <div className="profile-page">
        <p className="text-muted">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="profile-page">
        <p className="profile-error">{error}</p>
      </div>
    )
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="profile-page">
      <div className="profile-card">
        {discordMessage && (
          <p className={`discord-banner ${discordMessage.type}`}>{discordMessage.text}</p>
        )}

        <h1 className="profile-username">{profile.username}</h1>
        <p className="profile-joined">Joined {joinDate}</p>

        <div className="profile-stats">
          <div className="stat-block">
            <span className="stat-label">Season Points</span>
            <span className="stat-value">{profile.total_points}</span>
          </div>
        </div>

        <div className="profile-section">
          <h2 className="section-title">Discord</h2>
          {profile.discord_linked ? (
            <p className="discord-status linked">✅ Linked</p>
          ) : (
            <>
              <p className="discord-status">Not linked</p>
              <button className="link-discord-btn" onClick={handleLinkDiscord}>
                Link Discord
              </button>
            </>
          )}
        </div>

        <div className="profile-section">
          <h2 className="section-title">Achievements</h2>
          {achievements.length > 0 ? (
            <ul className="achievement-list">
              {achievements.map(a => (
                <li 
                  key={a.key} 
                  className={`achievement-list-item rarity-${a.rarity.toLowerCase()}`}
                  data-tooltip={a.description}
                >
                  <span className="achievement-list-name">{a.name}</span>
                  {a.times_earned > 1 && (
                    <span className="achievement-list-count">×{a.times_earned}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted achievements-placeholder">
              No Achievements Earned Yet — start earning achievements as the season progresses.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile