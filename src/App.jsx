import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Home from './Pages/Home'
import Buyer from './Pages/Buyer' // Make sure this component exists
import './App.css'
import Supplier from './Pages/Supplier'
import Investor from './Pages/Investor'
import { WalletProvider } from './WalletContext'
import ErrorBoundary from './contract/ErrorBoundry'


const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <ErrorBoundary>

      <WalletProvider>
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
      </WalletProvider>
    </ErrorBoundary>
  )
}

export default App