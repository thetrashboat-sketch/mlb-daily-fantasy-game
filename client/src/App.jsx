import { Routes, Route, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import DateStrip from './components/DateStrip.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile from './pages/Profile.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import History from './pages/History.jsx'

function App() {
  const location = useLocation();
  const showLayout = location.pathname !== '/'; 

  return (
    <>
    {showLayout && <Nav />}
    {showLayout && <DateStrip />}

    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/Leaderboard" element={<Leaderboard />} />
      <Route path="/Profile" element={<Profile />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/History/:userId" element={<History />} />
    </Routes>
    </>
  )
}

export default App