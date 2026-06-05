import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchCartoons } from "../services/newsService";
import type { CartoonItem } from "../types/news";

// 생성된 모든 AI 만화 목록을 불러와 최신순으로 정렬해주는 훅
export function useCartoons() {
  const [cartoons, setCartoons] = useState<CartoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  
  // 특정 뉴스 상세페이지에서 '만화 보기'로 넘어온 경우, 해당 만화 카드로 스크롤 포커스하기 위한 ID
  const targetNewsId = searchParams.get("newsId");

  useEffect(() => {
    const loadCartoonsData = async () => {
      try {
        const data = await fetchCartoons();
        // 만화 데이터 유효성 검사 및 정제 (배열이 아니거나 잘못된 형식 필터링)
        const validCartoons = data.filter((item) => {
          return (
            item &&
            Array.isArray(item.comic_urls) &&
            item.comic_urls.length > 0 &&
            (typeof item.comic_urls[0] === "string" || 
             (item.comic_urls[0] && typeof item.comic_urls[0].url === "string"))
          );
        });
        // 최신 생성 날짜 순서대로 정렬 (내림차순)
        const sortedCartoons = validCartoons.sort((a, b) => {
          const dateA = a.published_at || "";
          const dateB = b.published_at || "";
          return dateB.localeCompare(dateA);
        });
        setCartoons(sortedCartoons);
      } catch (error) {
        console.error("AI 만화 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCartoonsData();
  }, []);

  return {
    cartoons,
    loading,
    targetNewsId,
  };
}
