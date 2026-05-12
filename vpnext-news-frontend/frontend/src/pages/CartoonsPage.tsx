import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";

// 🌟 1. 엑스박스 완벽 해결: 브라우저 캐시를 무시하는 강력한 재시도 로직 🌟
const ComicImage = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [retries, setRetries] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    // 최대 15번(약 1분)까지 여유롭게 대기합니다.
    if (retries < 15) {
      setTimeout(() => {
        setRetries((prev) => prev + 1);
        // [핵심] 주소 끝에 현재 시간을 달아 브라우저가 "새로운 이미지"로 착각하고 무조건 다시 가져오게 만듭니다.
        // Pollinations 서버는 앞부분 프롬프트가 같으면 그리던 작업을 마저 이어서 처리해 줍니다.
        setImgSrc(`${src}&cb=${Date.now()}`);
      }, 4000);
    } else {
      setHasError(true);
    }
  };

  return hasError ? (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 py-20 min-h-[300px]">
      <span className="text-3xl mb-2">🥲</span>
      <p className="text-sm font-bold">이미지 로딩 실패</p>
    </div>
  ) : (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={className}
      loading="lazy"
    />
  );
};

export default function CartoonsPage() {
  const [cartoons, setCartoons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const targetNewsId = searchParams.get("newsId");

  // 만화 데이터 가져오기
  useEffect(() => {
    const fetchCartoons = async () => {
      try {
        const res = await api.get("/api/cartoons");
        setCartoons(res.data);
      } catch (error) {
        console.error("만화 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCartoons();
  }, []);

  // 특정 기사에서 넘어왔을 경우, 해당 만화 카드로 부드럽게 스크롤
  useEffect(() => {
    if (!loading && targetNewsId && cartoons.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`comic-${targetNewsId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // 시각적 강조 효과 (옵션)
          element.classList.add("ring-4", "ring-purple-400", "ring-offset-4");
          setTimeout(
            () =>
              element.classList.remove(
                "ring-4",
                "ring-purple-400",
                "ring-offset-4",
              ),
            2000,
          );
        }
      }, 300);
    }
  }, [loading, targetNewsId, cartoons]);

  if (loading) {
    return (
      <div className="mt-32 text-center text-slate-500 font-medium">
        만화를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="mt-8 pb-20">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-3 mb-3">
          🎨 AI 만화 모음집
        </h1>
        <p className="text-slate-500">
          AI가 뉴스를 읽고 직접 그린 4컷 만화 갤러리입니다.
        </p>
      </header>

      {cartoons.length === 0 ? (
        <div className="text-center bg-slate-50 border border-slate-200 rounded-2xl p-20 text-slate-500">
          아직 생성된 만화가 없습니다. 기사 상세 페이지에서 만화를 생성해
          보세요!
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          {cartoons.map((item) => (
            <div
              key={item.news_id}
              id={`comic-${item.news_id}`}
              className="bg-amber-50 border-4 border-slate-900 p-6 md:p-10 rounded-3xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] transition-all duration-700"
            >
              <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b-4 border-slate-900 pb-6">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 line-clamp-1 uppercase tracking-tight">
                  {item.title}
                </h2>
                <Link
                  to={`/news/${item.news_id}`}
                  className="shrink-0 text-sm md:text-base font-black text-slate-900 bg-yellow-300 border-2 border-slate-900 px-5 py-2.5 rounded-full hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all"
                >
                  원본 기사 보기
                </Link>
              </div>

              {/* 4컷 만화 그리드 레이아웃 (Retro Comic Style) */}
              <div className="border-4 border-slate-900 rounded-xl overflow-hidden">
                {item.comic_urls.map((scene: any, idx: number) => {
                  // [중요] 기존 DB에 저장된 문자열 데이터(URL만 있는 경우)와의 호환성을 위한 처리
                  const imageUrl =
                    typeof scene === "string" ? scene : scene.url;
                  const captionText =
                    typeof scene === "string"
                      ? `Scene ${idx + 1}`
                      : scene.caption;

                  return (
                    <div
                      key={idx}
                      className="relative border-b-2 border-slate-800 last:border-b-0 overflow-hidden group"
                    >
                      {/* 1. 만화 이미지 영역 */}
                      <div className="relative min-h-[300px] bg-slate-800">
                        <ComicImage
                          src={imageUrl}
                          alt={`Scene ${idx + 1}`}
                          className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        {/* 화수 번호 배지 */}
                        <div className="absolute top-3 left-3 bg-yellow-400 text-slate-900 border-2 border-slate-900 w-8 h-8 flex items-center justify-center rounded-full font-black text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] z-10">
                          {idx + 1}
                        </div>
                      </div>

                      {/* 2. 🌟 말풍선 텍스트 크기 확대 (text-[14px] -> text-lg, font-extrabold) 🌟 */}
                      <div className="absolute bottom-4 left-4 right-4 z-10">
                        <div className="relative bg-white border-2 border-slate-800 rounded-2xl p-5 shadow-[4px_4px_0px_rgba(30,41,59,1)]">
                          {/* 말풍선 꼬리 */}
                          <div className="absolute -top-2 left-8 w-4 h-4 bg-white border-t-2 border-l-2 border-slate-800 transform rotate-45"></div>

                          {/* 자막 텍스트 (더 크고 진하게 변경) */}
                          <p className="text-lg text-slate-900 font-extrabold leading-relaxed break-keep relative z-10 text-center">
                            {captionText}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
