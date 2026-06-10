import type { NewsItem } from "../types/news";

/** 언론사 키 정규화 (라운드로빈 그룹핑용) */
export function getSourceGroupKey(news: NewsItem): string {
  const raw = news.source?.toLowerCase().trim() || "";
  if (news.url?.includes("naver.com")) return "naver";
  return raw || "unknown";
}

/**
 * 언론사별 라운드로빈 인터리빙
 * — 한 언론사가 연속으로 쏟아지는 것을 방지하고 포털처럼 섞어서 노출
 */
export function diversifyBySource(items: NewsItem[]): NewsItem[] {
  if (items.length <= 1) return items;

  const seen = new Set<number>();
  const buckets = new Map<string, NewsItem[]>();

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const key = getSourceGroupKey(item);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  const queues = [...buckets.values()].sort(
    (a, b) =>
      new Date(b[0].published_at).getTime() - new Date(a[0].published_at).getTime(),
  );

  const result: NewsItem[] = [];
  let remaining = true;

  while (remaining) {
    remaining = false;
    for (const queue of queues) {
      const next = queue.shift();
      if (next) {
        result.push(next);
        remaining = true;
      }
    }
  }

  return result;
}

/** 기존 목록 뒤에 신규 기사를 중복 없이·다양하게 이어붙임 */
export function appendDiverseNews(existing: NewsItem[], incoming: NewsItem[]): NewsItem[] {
  if (incoming.length === 0) return existing;

  const existingIds = new Set(existing.map((item) => item.id));
  const fresh = incoming.filter((item) => !existingIds.has(item.id));
  if (fresh.length === 0) return existing;

  return [...existing, ...diversifyBySource(fresh)];
}
