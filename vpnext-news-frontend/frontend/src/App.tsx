import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import MainPage from "./pages/MainPage";
import DetailPage from "./pages/DetailPage";

function App() {
  return (
    <BrowserRouter>
      {/* 바탕색을 밝은 그레이 대신 차분한 Slate 계열로 변경 */}
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
        <Header />

        {/* 중앙 컨테이너 너비를 더 넉넉하게 조정 (max-w-6xl) */}
        <main className="max-w-6xl mx-auto px-6">
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/news/:id" element={<DetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
