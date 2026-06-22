import { Routes, Route, useLocation } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile from './pages/Profile.jsx'
import HowItWorks from './pages/HowItWorks.jsx'

function App() {
  const location = useLocation();
  const showNav = location.pathname !== '/'; 

  return (
    <>
    {showNav && <Nav />}

    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/Leaderboard" element={<Leaderboard />} />
      <Route path="/Profile" element={<Profile />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
    </Routes>
    </>
  )
}

export default App