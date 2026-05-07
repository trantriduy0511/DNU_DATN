import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const THEME_KEY = 'dnu_theme'

const applyInitialTheme = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const root = document.documentElement
  const saved = window.localStorage?.getItem(THEME_KEY)
  const theme = saved === 'light' || saved === 'dark' ? saved : 'light'
  const isDark = theme === 'dark'

  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
}

applyInitialTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)












