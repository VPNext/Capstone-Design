import { SOURCE_NAME_MAP } from "../constants/source";
import { diversifyBySource } from "../utils/diversifyNews";
import { fetchNewsList } from "./newsService";
import type { NewsItem } from "../types/news";

const SOURCE_KEYS = Object.keys(SOURCE_NAME_MAP);
const INITIAL_PER_SOURCE = 4;
const FEED_PAGE_SIZE = 30;

interface DiverseFeedResult {
  items: NewsItem[];
  total: number;
  nextFeedPage: number;
}

/** 초기 로드: 언론사별 소량 병렬 fetch → 라운드로빈 혼합 */
export async function fetchDiverseInitialFeed(
  isAnalyzed: boolean,
  keyword: string,
): Promise<DiverseFeedResult> {
  const trimmedKeyword = keyword.trim();

  const [countRes, ...sourceResponses] = await Promise.all([
    fetchNewsList(1, undefined, isAnalyzed, trimmedKeyword || undefined, 1),
    ...SOURCE_KEYS.map((source) =>
      fetchNewsList(1, source, isAnalyzed, trimmedKeyword || undefined, INITIAL_PER_SOURCE).catch(
        () => ({ items: [] as NewsItem[], total: 0, page: 1, size: INITIAL_PER_SOURCE }),
      ),
    ),
  ]);

  const items = diversifyBySource(sourceResponses.flatMap((res) => res.items));

  return {
    items,
    total: countRes.total,
    nextFeedPage: 2,
  };
}

/** 추가 로드: 통합 피드 페이지 fetch → 기존 목록에 다양하게 append */
export async function fetchDiverseFeedPage(
  page: number,
  isAnalyzed: boolean,
  keyword: string,
): Promise<{ items: NewsItem[]; total: number }> {
  const trimmedKeyword = keyword.trim();
  const res = await fetchNewsList(
    page,
    undefined,
    isAnalyzed,
    trimmedKeyword || undefined,
    FEED_PAGE_SIZE,
  );
  return { items: res.items, total: res.total };
}

export { FEED_PAGE_SIZE, INITIAL_PER_SOURCE };
