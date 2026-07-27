import { NavLink, useNavigate } from 'react-router-dom'
import './Nav.css'

function Nav() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      console.error('[logout]', err.message)
    } finally {
      navigate('/')
    }
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <NavLink to="/dashboard" className="nav-logo">
          DAILY <span className="nav-logo-accent">DINGER</span>
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Leaderboard
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Profile
          </NavLink>
          <NavLink to="/how-it-works" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            How It Works
          </NavLink>
          <button className="logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Nav