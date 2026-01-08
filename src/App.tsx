import React, { useEffect } from 'react'
import Router from './components/Router'
import { preloadExchangeRates } from './utils/currencyConverter'
// Import global error handler to activate it
import './utils/supabaseErrorHandler'

function App() {
  // Preload exchange rates when app starts
  useEffect(() => {
    preloadExchangeRates();
  }, []);

  return <Router />
}

export default App