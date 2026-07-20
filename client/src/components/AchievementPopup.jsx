import './AchievementPopup.css'

function AchievementPopup({ achievement, onClose }) {
  const { name, description, rarity, playerName, isReEarn, timesEarned } = achievement

  return (
    <div className="achievement-overlay">
      <div className={`achievement-popup rarity-${rarity.toLowerCase()}`}>
        <p className="achievement-label">
          {isReEarn ? `Achievement Earned Again (x${timesEarned})` : 'Achievement Unlocked!'}
        </p>
        <h2 className="achievement-name">{name}</h2>
        <p className="achievement-description">{description}</p>
        {playerName && <p className="achievement-player">{playerName}</p>}
        <p className="achievement-rarity">{rarity}</p>
        <button className="achievement-dismiss" onClick={onClose}>
          Nice!
        </button>
      </div>
    </div>
  )
}

export default AchievementPopup