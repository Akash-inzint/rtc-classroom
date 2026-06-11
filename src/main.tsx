import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// StrictMode double-invokes effects which causes joinRoom to be called twice
// and tears down event handlers mid-join. Disabled for this RTC app.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)
