import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Buyer from './Buyer' // Make sure this component exists
import './App.css'
import Supplier from './Supplier'
import Investor from './Investor'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/buyer" element={<Buyer />} />
          <Route path="/supplier" element={<Supplier />} />
          <Route path="/investor" element={<Investor />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App