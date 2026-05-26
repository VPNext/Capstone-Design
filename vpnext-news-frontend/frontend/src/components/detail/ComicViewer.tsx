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
          className="px-8 py-3.5 text-lg font-black transition-all duration-200 inline-block"
          style={{
            background: "#7C3AED",
            color: "#fff",
            borderRadius: "16px",
            boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#6D28D9";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#7C3AED";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
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
                className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "#161311",
                  color: "#fff",
                  borderRadius: "14px",
                  boxShadow: "0 2px 12px rgba(22,19,17,0.2)",
                }}
                onMouseEnter={(e) => {
                  if (!isComicGenerating) {
                    (e.currentTarget as HTMLElement).style.background = "#7C3AED";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#161311";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {isComicGenerating ? "생성 중... ⏳" : "AI 자동 생성"}
              </button>
              <button
                onClick={() => setShowPromptInput(true)}
                disabled={isComicGenerating}
                className="px-6 py-3.5 text-lg font-black transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "#fff",
                  color: "#4C1D95",
                  border: "2px solid #C4B5FD",
                  borderRadius: "14px",
                }}
                onMouseEnter={(e) => {
                  if (!isComicGenerating) {
                    (e.currentTarget as HTMLElement).style.borderColor = "#7C3AED";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#C4B5FD";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
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
                className="w-full h-24 p-4 resize-none font-medium outline-none transition-all"
                style={{
                  border: "2px solid #C4B5FD",
                  color: "#161311",
                  background: "#fff",
                  borderRadius: "12px",
                }}
                onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#7C3AED")}
                onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#C4B5FD")}
                disabled={isComicGenerating}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPromptInput(false)}
                  disabled={isComicGenerating}
                  className="px-4 py-2 font-bold transition-colors duration-200"
                  style={{ color: "#9C9891" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#161311")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#9C9891")}
                >
                  취소
                </button>
                <button
                  onClick={() => handleGenerateComic(customPrompt)}
                  disabled={isComicGenerating || customPrompt.trim().length === 0}
                  className="px-6 py-2 font-black transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: "#7C3AED",
                    color: "#fff",
                    borderRadius: "10px",
                    boxShadow: "0 2px 12px rgba(124,58,237,0.25)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isComicGenerating && customPrompt.trim().length > 0) {
                      (e.currentTarget as HTMLElement).style.background = "#6D28D9";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#7C3AED";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
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
