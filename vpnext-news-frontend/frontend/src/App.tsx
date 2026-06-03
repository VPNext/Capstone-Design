import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";
import ScrollToTop from "./components/ScrollToTop";
import "./App.css";

// 페이지 컴포넌트 코드 분할(Lazy Loading) 적용으로 초기 로딩 속도(LCP) 극대화
const MainPage = lazy(() => import("./pages/MainPage"));
const DetailPage = lazy(() => import("./pages/DetailPage"));
const CartoonsPage = lazy(() => import("./pages/CartoonsPage"));
const AnalyzedNewsPage = lazy(() => import("./pages/AnalyzedNewsPage"));

// 페이지 비동기 로드 중 표시할 연성 스켈레톤/스피너 플레이스홀더
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#9C9891] font-sans">
      <div className="w-8 h-8 rounded-full border-2 border-[#9C9891]/20 border-t-[#161311] animate-spin mb-3" />
      <span className="text-xs font-semibold uppercase tracking-[0.1em] opacity-80">
        Loading Page
      </span>
    </div>
  );
}

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
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<MainPage />} />
                  <Route path="/news/:id" element={<DetailPage />} />
                  <Route path="/cartoons" element={<CartoonsPage />} />
                  <Route path="/analyzed" element={<AnalyzedNewsPage />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;

