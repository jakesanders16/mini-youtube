import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'   // ← add this line
import './index.css'  // keep if you have it

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>           {/* ← add this opening tag */}
      <App />
    </BrowserRouter>          {/* ← add this closing tag */}
  </React.StrictMode>,
)