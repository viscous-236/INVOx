import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Home from './Home'
import Buyer from './Buyer' // Make sure this component exists
import './App.css'
import Supplier from './Supplier'
import Investor from './Investor'

// ScrollToTop component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <div className="App">
        <ScrollToTop /> {/* Add this component */}
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