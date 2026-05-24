import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import MainPage from "./pages/MainPage";
import DetailPage from "./pages/DetailPage";
import CartoonsPage from "./pages/CartoonsPage";
import AnalyzedNewsPage from "./pages/AnalyzedNewsPage";

function App() {
  return (
    <BrowserRouter>
      <div
        className="min-h-screen pb-20"
        style={{
          background: "#F7F4EF",
          fontFamily: "'Noto Sans KR', sans-serif",
        }}
      >
        <Header />
        <main className="max-w-6xl mx-auto px-4 sm:px-6">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/news/:id" element={<DetailPage />} />
            <Route path="/cartoons" element={<CartoonsPage />} />
            <Route path="/analyzed" element={<AnalyzedNewsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
