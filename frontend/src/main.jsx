import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Error Listeners for non-React errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  // Optionally trigger a toast or log service here
  // import { toast } from 'react-toastify';
  // toast.error("An unexpected error occurred"); 
  // (Note: importing toast here might cause circular deps or initialization issues depending on setup, 
  // but console logging ensures it's not silent)
});

window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
