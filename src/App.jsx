import React from 'react'
import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import HostPage from './pages/HostPage'
import PlayerPage from './pages/PlayerPage'
import DisplayPage from './pages/DisplayPage'
import TestPage from './pages/TestPage'
import TriviaTestPage from './pages/TriviaTestPage'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/trivia-test" element={<TriviaTestPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/player/:sessionId" element={<PlayerPage />} />
        <Route path="/player/:sessionId/:playerName" element={<PlayerPage />} />
        <Route path="/display" element={<DisplayPage />} />
      </Routes>
    </div>
  )
}

export default App
