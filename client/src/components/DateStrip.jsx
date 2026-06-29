import { useState, useEffect } from 'react'
import './DateStrip.css'

function DateStrip() {
  const [slateCount, setSlateCount] = useState(null)

  useEffect(() => {
    fetchSlate()
  }, [])

  async function fetchSlate() {
    try {
      const res = await fetch('/api/slate', { credentials: 'include' })
      const data = await res.json()
      setSlateCount(data.slate)
    } catch (err) {
      setSlateCount(null)
    }
  }

  function formatToday() {
    const formatted = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return formatted.replaceAll(',', '').toUpperCase()
  }

  return (
    <div className="date-strip">
      <div className="date-strip-inner">
        <span>{formatToday()}</span>
        <span>SLATE: {slateCount !== null ? `${slateCount} GAMES` : '—'}</span>
      </div>
    </div>
  )
}

export default DateStrip