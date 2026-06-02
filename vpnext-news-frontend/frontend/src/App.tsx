import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
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
            className="min-h-screen flex flex-col bg-[#0E0C0A] font-sans"
            style={{
              background: "var(--paper)",
            }}
          >
            <Header />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6">
              <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/news/:id" element={<DetailPage />} />
                <Route path="/cartoons" element={<CartoonsPage />} />
                <Route path="/analyzed" element={<AnalyzedNewsPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
