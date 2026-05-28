import { Link } from "react-router-dom";

type AnalysisStatus = "pending" | "analyzing" | "complete";

interface ComicViewerProps {
  id: string | undefined;
  status: AnalysisStatus;
  comicUrls: string[] | null;
  isComicGenerating: boolean;
  showPromptInput: boolean;
  setShowPromptInput: (value: boolean) => void;
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  handleGenerateComic: (promptText?: string) => Promise<void>;
}

export default function ComicViewer({
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
      className="mt-8 p-8 flex flex-col items-center gap-5 text-center"
      style={{
        background: "#FAF5FF",
        border: "1px solid #E9D5FF",
        borderRadius: "24px",
        boxShadow: "0 2px 16px rgba(109,40,217,0.08)",
      }}
    >
      <div>
        <h3
          className="text-xl font-black mb-1 flex items-center justify-center gap-2"
          style={{ color: "#4C1D95" }}
        >
          🎨 AI 뉴스 4컷 만화
        </h3>
        <p className="text-sm" style={{ color: "#6D28D9" }}>
          이 기사의 핵심 내용을 AI가 만화로 그려줍니다.
        </p>
      </div>

      {comicUrls ? (
        <Link
          to={`/cartoons?newsId=${id}`}
          className="px-8 py-3.5 text-lg font-black transition-all duration-200 inline-block bg-[#7C3AED] text-white rounded-[16px] hover:bg-[#6D28D9] hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_16px_rgba(124,58,237,0.3)]"
        >
          보러가기 (AI 만화 모음집)
        </Link>
      ) : (
        <div className="w-full flex flex-col gap-4 mt-2">
          {!showPromptInput ? (
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => handleGenerateComic()}
                disabled={isComicGenerating}
                className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50 bg-[#161311] text-white rounded-[14px] shadow-[0_2px_12px_rgba(22,19,17,0.2)] hover:bg-[#7C3AED] hover:-translate-y-0.5 active:translate-y-0 disabled:hover:bg-[#161311] disabled:hover:translate-y-0 cursor-pointer"
              >
                {isComicGenerating ? "생성 중... ⏳" : "AI 자동 생성"}
              </button>
              <button
                onClick={() => setShowPromptInput(true)}
                disabled={isComicGenerating}
                className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50 bg-white text-[#4C1D95] border-2 border-[#C4B5FD] rounded-[14px] hover:border-[#7C3AED] hover:-translate-y-0.5 active:translate-y-0 disabled:hover:border-[#C4B5FD] disabled:hover:translate-y-0 cursor-pointer"
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
                className="w-full h-24 p-4 resize-none font-medium outline-none transition-all border-2 border-[#C4B5FD] text-[#161311] bg-white rounded-[12px] focus:border-[#7C3AED] focus:outline-none"
                disabled={isComicGenerating}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPromptInput(false)}
                  disabled={isComicGenerating}
                  className="px-4 py-2 font-bold transition-colors duration-200 text-[#9C9891] hover:text-[#161311] cursor-pointer"
                >
                  취소
                </button>
                <button
                  onClick={() => handleGenerateComic(customPrompt)}
                  disabled={isComicGenerating || customPrompt.trim().length === 0}
                  className="px-6 py-2 font-black transition-all duration-200 disabled:opacity-50 bg-[#7C3AED] text-white rounded-[10px] shadow-[0_2px_12px_rgba(124,58,237,0.25)] hover:bg-[#6D28D9] hover:-translate-y-0.5 active:translate-y-0 disabled:hover:bg-[#7C3AED] disabled:hover:translate-y-0 cursor-pointer"
                >
                  {isComicGenerating ? "생성 중... ⏳" : "이 내용으로 생성"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
