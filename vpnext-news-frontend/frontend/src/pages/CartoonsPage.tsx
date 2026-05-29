import { Link } from "react-router-dom";
import { useCartoons } from "../hooks/useCartoons";
import PageHeader from "../components/cartoons/PageHeader";
import SkeletonComicCard from "../components/cartoons/SkeletonComicCard";
import CartoonCard from "../components/cartoons/CartoonCard";

// 지금까지 생성된 AI 만화들을 모아볼 수 있는 만화 목록 페이지
export default function CartoonsPage() {
  const { cartoons, loading, targetNewsId } = useCartoons();

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
        // 최신 생성순으로 정렬된 AI 만화 목록 카드들 렌더링
        <div className="flex flex-col gap-12">
          {cartoons.map((item) => (
            <CartoonCard
              key={item.news_id}
              item={item}
              // 특정 기사에서 타고 넘어온 경우, 해당 만화 카드 테두리를 하이라이트 표시
              highlight={targetNewsId === String(item.news_id)}
            />
          ))}

          <div className="py-10 flex flex-col items-center text-[#9C9891]">
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
