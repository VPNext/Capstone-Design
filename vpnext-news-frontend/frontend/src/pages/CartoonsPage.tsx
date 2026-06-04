import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCartoons } from "../hooks/useCartoons";
import PageHeader from "../components/cartoons/PageHeader";
import SkeletonComicCard from "../components/cartoons/SkeletonComicCard";
import CartoonCard from "../components/cartoons/CartoonCard";

// 지금까지 생성된 AI 만화들을 모아볼 수 있는 만화 목록 페이지
export default function CartoonsPage() {
  const { cartoons, loading, targetNewsId } = useCartoons();
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

  // 외부(상세 페이지 등)에서 특정 뉴스 만화 ID를 넘겨받은 경우 즉시 해당 피드로 전환
  useEffect(() => {
    if (targetNewsId) {
      setSelectedNewsId(targetNewsId);
    }
  }, [targetNewsId]);

  // 만화 목록 불러오는 중일 때의 스켈레톤 로더 화면
  if (loading) {
    return (
      <div className="mt-8 pb-24 font-sans">
        <PageHeader />
        <div className="flex flex-col gap-10">
          <SkeletonComicCard />
          <SkeletonComicCard />
        </div>
      </div>
    );
  }

  // 💡 선택된 만화 상세 피드 뷰 모드
  if (selectedNewsId) {
    const selectedCartoon = cartoons.find((c) => String(c.news_id) === selectedNewsId);

    return (
      <div className="mt-8 pb-24 font-sans">
        {/* 갤러리 뷰 리스트로 다시 돌아가기 */}
        <button
          onClick={() => setSelectedNewsId(null)}
          className="inline-flex items-center gap-1.5 text-sm font-black mb-7 transition-colors duration-200 text-[#9C9891] hover:text-[#161311] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          목록으로 돌아가기
        </button>

        {selectedCartoon ? (
          <div className="max-w-3xl mx-auto">
            <CartoonCard
              item={selectedCartoon}
              highlight={true}
              viewMode="feed"
            />
          </div>
        ) : (
          <div className="text-center py-20 text-[#9C9891]">
            해당 만화 데이터를 조회할 수 없습니다.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 pb-24 font-sans">
      {/* 상단 헤더 영역 (현재 생성된 총 만화 개수 표시) */}
      <PageHeader count={cartoons.length} />

      {/* 저장된 만화가 없을 때의 대체 화면 */}
      {cartoons.length === 0 ? (
        <div className="text-center py-24 flex flex-col items-center gap-5 border-2 border-dashed border-[#D1CAC0] rounded-[24px] bg-white/60">
          <span className="text-[64px]">🖌️</span>
          <div>
            <p className="text-lg font-black mb-2 text-[#2C2926]">
              아직 생성된 만화가 없습니다
            </p>
            <p className="text-sm text-[#9C9891]">
              기사 상세 페이지에서 만화 생성 버튼을 눌러보세요!
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-black px-6 py-3 rounded-full bg-[#161311] text-white shadow-[0_4px_16px_rgba(22,19,17,0.2)] transition-all duration-200 hover:bg-[#C13026] hover:-translate-y-[2px]"
          >
            📰 뉴스 목록으로
          </Link>
        </div>
      ) : (
        // 단일 갤러리 그리드 레이아웃 렌더링
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cartoons.map((item) => (
            <CartoonCard
              key={item.news_id}
              item={item}
              highlight={targetNewsId === String(item.news_id)}
              viewMode="grid"
              onSelect={(newsId) => setSelectedNewsId(newsId)}
            />
          ))}

          <div className="col-span-full py-10 flex flex-col items-center text-[#9C9891]">
            <div className="divider-ornate w-full max-w-xs text-center">
              <span className="text-sm font-medium">
                모든 만화를 불러왔습니다
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

