import { memo } from "react";
import { Link } from "react-router-dom";
import type { ComicScene } from "../../types/news";

type AnalysisStatus = "pending" | "analyzing" | "complete";

interface ComicViewerProps {
  id: string | undefined;
  status: AnalysisStatus;
  comicUrls: (ComicScene | string)[] | null;
  isComicGenerating: boolean;
  showPromptInput: boolean;
  setShowPromptInput: (value: boolean) => void;
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  handleGenerateComic: (promptText?: string) => Promise<void>;
}

const ComicViewer = memo(function ComicViewer({
  id,
  status,
  comicUrls,
  isComicGenerating,
  showPromptInput,
  setShowPromptInput,
  customPrompt,
  setCustomPrompt,
  handleGenerateComic,
}: ComicViewerProps) {
  if (status !== "complete") return null;

  return (
    <div
      className="mt-8 p-8 flex flex-col items-center gap-5 text-center bg-gradient-to-br from-purple-50/40 via-white/40 to-purple-50/20 border border-purple-200/60 rounded-3xl shadow-[0_4px_20px_rgba(109,40,217,0.03)] hover:border-purple-300/80 transition-all duration-[400ms] hover:shadow-[0_12px_32px_rgba(109,40,217,0.08)] w-full"
    >
      <div className="mb-2">
        <h3
          className="text-xl font-black mb-1 flex items-center justify-center gap-2 text-purple-900"
        >
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          AI 뉴스 웹툰 요약
        </h3>
        <p className="text-sm text-purple-700/80 font-medium">
          이 기사의 핵심 스토리를 AI 웹툰으로 한눈에 감상해 보세요.
        </p>
      </div>

      {comicUrls ? (
        <div className="w-full mt-4 flex flex-col items-center gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            {comicUrls.map((scene, idx) => {
              const imageUrl = typeof scene === "string" ? scene : scene.url;
              const caption = typeof scene === "string" ? null : scene.caption;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center bg-[#141210] rounded-2xl overflow-hidden border border-white/5 shadow-md hover:border-purple-500/30 transition-all duration-300 group"
                >
                  <div className="relative w-full aspect-video md:aspect-[4/3] bg-[#0A0806] overflow-hidden flex items-center justify-center">
                    <span className="absolute top-3 left-3 z-10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-600 text-white rounded shadow-sm select-none">
                      CUT {idx + 1}
                    </span>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={`Cut ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0A0806] flex items-center justify-center text-white/20 text-xs">
                        만화 이미지를 그리지 못했습니다
                      </div>
                    )}
                  </div>
                  {caption && (
                    <div className="w-full p-4 bg-[#1C1A18] text-center border-t border-white/5 min-h-[72px] flex items-center justify-center">
                      <p className="text-xs font-semibold text-purple-200/90 leading-relaxed font-sans px-2">
                        &ldquo; {caption} &rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-2">
            <Link
              to={`/cartoons?newsId=${id}`}
              className="px-8 py-3.5 text-[15px] font-black transition-all duration-200 inline-block bg-purple-600 text-white rounded-2xl hover:bg-purple-700 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_16px_rgba(124,58,237,0.25)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] cursor-pointer"
            >
              전체 화면으로 크게 감상하기 (모음집)
            </Link>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col gap-4 mt-2">
          {!showPromptInput ? (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => handleGenerateComic()}
                disabled={isComicGenerating}
                className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50 bg-[#161311] text-white rounded-2xl shadow-[0_2px_12px_rgba(22,19,17,0.2)] hover:bg-purple-600 hover:-translate-y-0.5 active:translate-y-0 disabled:hover:bg-[#161311] disabled:hover:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
              >
                {isComicGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    생성 중...
                  </>
                ) : (
                  "AI 자동 생성"
                )}
              </button>
              <button
                onClick={() => setShowPromptInput(true)}
                disabled={isComicGenerating}
                className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50 bg-white text-purple-900 border-2 border-purple-200 rounded-2xl hover:border-purple-600 hover:-translate-y-0.5 active:translate-y-0 disabled:hover:border-purple-200 disabled:hover:translate-y-0 cursor-pointer"
              >
                직접 디렉팅
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full">
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="예: 주인공을 고양이로 그려줘, 배경을 우주로 해줘..."
                className="w-full h-24 p-4 resize-none font-medium outline-none transition-all border-2 border-purple-200 text-[#161311] bg-white rounded-xl focus:border-purple-600 focus:outline-none"
                disabled={isComicGenerating}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPromptInput(false)}
                  disabled={isComicGenerating}
                  className="px-4 py-2 font-bold transition-colors duration-200 text-[#9C9891] hover:text-[#161311] cursor-pointer text-sm"
                >
                  취소
                </button>
                <button
                  onClick={() => handleGenerateComic(customPrompt)}
                  disabled={isComicGenerating || customPrompt.trim().length === 0}
                  className="px-6 py-2.5 font-black transition-all duration-200 disabled:opacity-50 bg-purple-600 text-white rounded-xl shadow-[0_2px_12px_rgba(124,58,237,0.25)] hover:bg-purple-700 hover:-translate-y-0.5 active:translate-y-0 disabled:hover:bg-purple-600 disabled:hover:translate-y-0 cursor-pointer flex items-center gap-2 text-sm"
                >
                  {isComicGenerating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      생성 중...
                    </>
                  ) : (
                    "이 내용으로 생성"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default ComicViewer;
