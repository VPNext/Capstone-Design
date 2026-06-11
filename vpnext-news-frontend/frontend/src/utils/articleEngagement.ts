/** 브라우저 로컬 저장소 및 백엔드 연동 기반 기사 조회수·좋아요 */

export interface ArticleMeta {
  id: number;
  title: string;
  source: string;
  image_url: string | null;
  published_at: string;
}

const STORAGE_KEYS = {
  VIEWS: "article_views",
  LIKES: "article_likes",
  LIKED_IDS: "liked_article_ids",
  METADATA: "article_metadata",
} as const;

type CountMap = Record<string, number>;

const listeners = new Set<() => void>();
let snapshotVersion = 0;

let views: CountMap = {};
let likes: CountMap = {};
let likedIds = new Set<number>();
let articleMetadata: Record<string, ArticleMeta> = {};
let hydrated = false;

function emit(): void {
  snapshotVersion += 1;
  listeners.forEach((listener) => listener());
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving to localStorage [key: ${key}]:`, e);
  }
}

function hydrate(): void {
  if (hydrated) return;
  views = readJson<CountMap>(STORAGE_KEYS.VIEWS, {});
  likes = readJson<CountMap>(STORAGE_KEYS.LIKES, {});
  const likedList = readJson<number[]>(STORAGE_KEYS.LIKED_IDS, []);
  likedIds = new Set(likedList);
  articleMetadata = readJson<Record<string, ArticleMeta>>(STORAGE_KEYS.METADATA, {});
  hydrated = true;
}

function toKey(id: number): string {
  return String(id);
}

export function subscribeEngagement(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEngagementSnapshot(): number {
  hydrate();
  return snapshotVersion;
}

export function getViewCount(articleId: number): number {
  hydrate();
  return views[toKey(articleId)] ?? 0;
}

export function getLikeCount(articleId: number): number {
  hydrate();
  return likes[toKey(articleId)] ?? 0;
}

export function isArticleLiked(articleId: number): boolean {
  hydrate();
  return likedIds.has(articleId);
}

/** 백엔드로부터 가져온 최신 views와 likes 데이터를 로컬 저장소에 동기화 */
export function syncEngagementFromBackend(articleId: number, backendViews: number, backendLikes: number): void {
  hydrate();
  const key = toKey(articleId);
  views = { ...views, [key]: backendViews };
  likes = { ...likes, [key]: backendLikes };
  
  writeJson(STORAGE_KEYS.VIEWS, views);
  writeJson(STORAGE_KEYS.LIKES, likes);
  emit();
}

/** 좋아요 토글 (로컬 스토리지에 눌렀는지 여부만 기록) */
export function toggleLikeLocal(articleId: number): boolean {
  hydrate();
  const key = toKey(articleId);
  const wasLiked = likedIds.has(articleId);
  let nextLiked = false;

  if (wasLiked) {
    likedIds = new Set([...likedIds].filter((id) => id !== articleId));
    likes = { ...likes, [key]: Math.max(0, (likes[key] ?? 1) - 1) };
  } else {
    likedIds = new Set(likedIds).add(articleId);
    likes = { ...likes, [key]: (likes[key] ?? 0) + 1 };
    nextLiked = true;
  }

  writeJson(STORAGE_KEYS.LIKED_IDS, Array.from(likedIds));
  writeJson(STORAGE_KEYS.LIKES, likes);
  emit();
  return nextLiked;
}

export function formatEngagementCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export function saveArticleMeta(meta: ArticleMeta): void {
  hydrate();
  const key = toKey(meta.id);
  const existing = articleMetadata[key];
  if (
    !existing ||
    existing.title !== meta.title ||
    existing.source !== meta.source ||
    existing.image_url !== meta.image_url ||
    existing.published_at !== meta.published_at
  ) {
    articleMetadata = { ...articleMetadata, [key]: meta };
    writeJson(STORAGE_KEYS.METADATA, articleMetadata);
    emit();
  }
}

export interface EngagementSummary {
  totalViews: number;
  totalLikes: number;
  likedCount: number;
  averageViews: number;
}

export function getEngagementSummary(): EngagementSummary {
  hydrate();
  const totalViews = Object.values(views).reduce((sum, val) => sum + val, 0);
  const totalLikes = Object.values(likes).reduce((sum, val) => sum + val, 0);
  const likedCount = likedIds.size;
  const viewedArticlesCount = Object.keys(views).length;
  const averageViews =
    viewedArticlesCount > 0 ? parseFloat((totalViews / viewedArticlesCount).toFixed(1)) : 0;

  return {
    totalViews,
    totalLikes,
    likedCount,
    averageViews,
  };
}

export interface ArticleEngagementItem extends ArticleMeta {
  views: number;
  likes: number;
  liked: boolean;
}

export function getTopArticlesByViews(limit: number = 5): ArticleEngagementItem[] {
  hydrate();
  return Object.keys(views)
    .map((idStr) => {
      const id = parseInt(idStr, 10);
      const meta = articleMetadata[idStr] || {
        id,
        title: `기사 #${id}`,
        source: "알 수 없음",
        image_url: null,
        published_at: "",
      };
      return {
        ...meta,
        views: views[idStr] ?? 0,
        likes: likes[idStr] ?? 0,
        liked: likedIds.has(id),
      };
    })
    .filter((item) => item.views > 0)
    .sort((a, b) => b.views - a.views || b.likes - a.likes)
    .slice(0, limit);
}

export function getTopArticlesByLikes(limit: number = 5): ArticleEngagementItem[] {
  hydrate();
  return Object.keys(likes)
    .map((idStr) => {
      const id = parseInt(idStr, 10);
      const meta = articleMetadata[idStr] || {
        id,
        title: `기사 #${id}`,
        source: "알 수 없음",
        image_url: null,
        published_at: "",
      };
      return {
        ...meta,
        views: views[idStr] ?? 0,
        likes: likes[idStr] ?? 0,
        liked: likedIds.has(id),
      };
    })
    .filter((item) => item.likes > 0)
    .sort((a, b) => b.likes - a.likes || b.views - a.views)
    .slice(0, limit);
}
