import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import MainPage from "./pages/MainPage";
import DetailPage from "./pages/DetailPage";
import CartoonsPage from "./pages/CartoonsPage";
import AnalyzedNewsPage from "./pages/AnalyzedNewsPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";
import ScrollToTop from "./components/ScrollToTop";
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div
            className="min-h-screen pb-24 bg-[#0E0C0A] font-sans"
            style={{
              background: "var(--paper)",
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
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
