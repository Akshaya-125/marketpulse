import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { WatchlistPage } from "./pages/WatchlistPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/watchlists/:id" element={<WatchlistPage />} />
      </Routes>
    </BrowserRouter>
  );
}
