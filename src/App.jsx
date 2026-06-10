import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Layout/Header'
import BottomNav from './components/Layout/BottomNav'
import HomePage from './pages/HomePage'
import PokemonDetailPage from './pages/PokemonDetailPage'
import CollectionPage from './pages/CollectionPage'
import ComparePage from './pages/ComparePage'
import TierRankingsPage from './pages/TierRankingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0D1117]">
        <Header />
        <main className="max-w-7xl mx-auto px-4 pt-6 pb-28">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/pokemon/:name" element={<PokemonDetailPage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/tiers" element={<TierRankingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
