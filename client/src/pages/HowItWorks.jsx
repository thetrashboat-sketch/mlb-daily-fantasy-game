import './HowItWorks.css'

const SCORING_RULES = [
  { label: 'Single', points: '+1' },
  { label: 'Double', points: '+2' },
  { label: 'Triple', points: '+3' },
  { label: 'Home Run', points: '+4' },
  { label: 'RBI', points: '+1' },
  { label: 'Run', points: '+1' },
  { label: 'Walk', points: '+1' },
  { label: 'Stolen Base', points: '+2' },
  { label: 'Hit By Pitch', points: '+1' },
  { label: 'Strikeout', points: '-1' },
  { label: 'Caught Stealing', points: '-1' },
  { label: 'GIDP', points: '-1' },
]

function HowItWorks() {
  function handleLinkDiscord() {
    window.location.href = '/api/discord/auth'
  }

  return (
    <div className="how-it-works-page">
      <h1 className="hiw-title">How It Works</h1>

      <section className="hiw-section">
        <h2>1. Claim a hitter</h2>
        <p>
          Every day, head to your dashboard and claim a random MLB hitter for the day's slate.
          You get one hitter per day — no picking, no trading, just the luck of the draw.
        </p>
      </section>

      <section className="hiw-section">
        <h2>2. Earn points from real stats</h2>
        <p>
          Once games finish, your hitter's real-world stat line is converted into fantasy points
          using the scoring rules below.
        </p>
        <table className="scoring-table">
          <thead>
            <tr>
              <th>Stat</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {SCORING_RULES.map((rule) => (
              <tr key={rule.label}>
                <td>{rule.label}</td>
                <td className={rule.points.startsWith('-') ? 'negative' : 'positive'}>
                  {rule.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="hiw-section">
        <h2>3. Watch for the multiplier</h2>
        <p>
          If your hitter's team plays but they don't get an at-bat, walk, or hit-by-pitch, your
          multiplier goes up by 1. The next day your hitter actually plays, your points for that
          day get multiplied — then the multiplier resets back to normal.
        </p>
      </section>

      <section className="hiw-section">
        <h2>4. Climb the leaderboard</h2>
        <p>
          Your points add up across the whole season. Check the leaderboard anytime to see where
          you stack up against everyone else.
        </p>
      </section>

      <section className="hiw-section">
        <h2>5. Link Discord for daily updates</h2>
        <p>
          Connect your Discord account to get picks-open alerts, midday updates, and evening
          recaps posted right in your server.
        </p>
        <button className="link-discord-btn" onClick={handleLinkDiscord}>
          Link Discord
        </button>
      </section>
    </div>
  )
}

export default HowItWorks