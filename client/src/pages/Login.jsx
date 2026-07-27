import { useState } from 'react'
import './Login.css'

function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState(null)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState(null)

  const isLogin = mode === 'login'
  const isForgot = mode === 'forgot'

  // ...handleChange, handleSubmit, handleForgotPassword, switchMode unchanged...
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
        setError(data.error || 'Something went wrong.')
        return
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError('Unable to connect. Please try again.')
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setForgotPasswordMessage(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username }),
      })

      const data = await res.json()
      setForgotPasswordMessage(data.message || data.error || 'Something went wrong.')
    } catch (err) {
      setForgotPasswordMessage('Unable to connect. Please try again.')
    }
  }

  function switchMode(newMode) {
    setMode(newMode)
    setError(null)
    setForgotPasswordMessage(null)
  }

  return (
    <div className="login-page">
      <div className="login-shell">

        <div className="login-branding">
          <div className="login-branding-inner">
            <div className="login-logo-slot">
              {/* logo vector goes here, e.g. <img src="/logo.svg" alt="Daily Dinger" /> */}
            </div>
            <h1 className="login-wordmark">
              DAILY <span className="login-wordmark-accent">DINGER</span>
            </h1>
            <p className="login-tagline">Claim your hitter. No Ball Knowledge Required</p>
          </div>
        </div>

        <div className="login-form-panel">
          {!isForgot && (
            <div className="login-toggle">
              <button className={`toggle-btn ${isLogin ? 'active' : ''}`} onClick={() => switchMode('login')}>
                Sign In
              </button>
              <button className={`toggle-btn ${!isLogin ? 'active' : ''}`} onClick={() => switchMode('register')}>
                Register
              </button>
            </div>
          )}

          {isForgot ? (
            <form className="login-form" onSubmit={handleForgotPassword}>
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

            {forgotPasswordMessage && <p className="login-error">{forgotPasswordMessage}</p>}

            <button type="submit" className="login-submit">
              Send Reset Link
            </button>

            <button type="button" className="forgot-password-link" onClick={() => switchMode('login')}>
              Back to Sign In
            </button>
            </form>
          ) : (
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
        <label htmlFor="email">Email <span className="optional">(optional)</span></label>
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

    {isLogin && (
      <button type="button" className="forgot-password-link" onClick={() => switchMode('forgot')}>
        Forgot password?
      </button>
    )}

    {error && <p className="login-error">{error}</p>}

    <button type="submit" className="login-submit">
      {isLogin ? 'Sign In' : 'Create Account'}
    </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}

export default Login