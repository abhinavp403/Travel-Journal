import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import TripPage from './pages/TripPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trip/:id" element={<TripPage />} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
