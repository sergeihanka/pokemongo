import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrainerLevelProvider } from './context/TrainerLevelContext.jsx'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      retry: 2,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TrainerLevelProvider>
        <App />
      </TrainerLevelProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
