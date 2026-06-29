import { useState } from 'react'
import './Login.css'

function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState(null)

  const isLogin = mode === 'login'

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!isLogin && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const body = isLogin
      ? { username: form.username, password: form.password }
      : { username: form.username, password: form.password, email: form.email || undefined }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Something went wrong.')
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError('Unable to connect. Please try again.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">DAILY DINGER</h1>
          <p className="login-tagline">Claim your hitter. No Ball Knowledge Required</p>
        </div>

        <div className="login-toggle">
          <button
            className={`toggle-btn ${isLogin ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            Sign In
          </button>
          <button
            className={`toggle-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null) }}
          >
            Register
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          {!isLogin && (
            <div className="field">
              <label htmlFor="email">Email <span className="optional">(optional NOTE: You will not be able to recover your account without email)</span></label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className="field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login