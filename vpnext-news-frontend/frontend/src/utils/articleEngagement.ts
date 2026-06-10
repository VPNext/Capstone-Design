/** 브라우저 로컬 저장소 기반 기사 조회수·좋아요 (백엔드 없이 프론트 전용) */

const STORAGE_KEYS = {
  VIEWS: "article_views",
  LIKES: "article_likes",
  LIKED_IDS: "liked_article_ids",
} as const;

const SESSION_VIEW_KEY = "article_viewed_ids";

const WRITE_DEBOUNCE_MS = 280;
const LIKE_COOLDOWN_MS = 400;
const VIEW_INCREMENT_DELAY_MS = 320;

type CountMap = Record<string, number>;

const listeners = new Set<() => void>();

let snapshotVersion = 0;

let views: CountMap = {};
let likes: CountMap = {};
let likedIds = new Set<number>();
let hydrated = false;

const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const likeCooldowns = new Map<number, ReturnType<typeof setTimeout>>();
const pendingViewTimers = new Map<number, ReturnType<typeof setTimeout>>();

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

function writeJsonDebounced(key: string, value: unknown): void {
  const existing = pendingWrites.get(key);
  if (existing) clearTimeout(existing);

  pendingWrites.set(
    key,
    setTimeout(() => {
      pendingWrites.delete(key);
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Error saving to localStorage [key: ${key}]:`, e);
      }
    }, WRITE_DEBOUNCE_MS),
  );
}

function hydrate(): void {
  if (hydrated) return;
  views = readJson<CountMap>(STORAGE_KEYS.VIEWS, {});
  likes = readJson<CountMap>(STORAGE_KEYS.LIKES, {});
  const likedList = readJson<number[]>(STORAGE_KEYS.LIKED_IDS, []);
  likedIds = new Set(likedList);
  hydrated = true;
}

function persistViews(): void {
  writeJsonDebounced(STORAGE_KEYS.VIEWS, views);
}

function persistLikes(): void {
  writeJsonDebounced(STORAGE_KEYS.LIKES, likes);
  writeJsonDebounced(STORAGE_KEYS.LIKED_IDS, Array.from(likedIds));
}

function toKey(id: number): string {
  return String(id);
}

function getSessionViewedIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(SESSION_VIEW_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function markSessionViewed(id: number): void {
  const viewed = getSessionViewedIds();
  viewed.add(id);
  try {
    sessionStorage.setItem(SESSION_VIEW_KEY, JSON.stringify(Array.from(viewed)));
  } catch {
    /* sessionStorage 용량 초과 등 — 조회수 증가만 스킵하지 않음 */
  }
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

/** 상세 페이지 진입 시 호출 — 세션당 1회, 짧은 지연 후 증가 */
export function scheduleViewIncrement(articleId: number): void {
  hydrate();

  const viewed = getSessionViewedIds();
  if (viewed.has(articleId)) return;

  const existing = pendingViewTimers.get(articleId);
  if (existing) clearTimeout(existing);

  pendingViewTimers.set(
    articleId,
    setTimeout(() => {
      pendingViewTimers.delete(articleId);
      if (getSessionViewedIds().has(articleId)) return;

      const key = toKey(articleId);
      views = { ...views, [key]: (views[key] ?? 0) + 1 };
      markSessionViewed(articleId);
      persistViews();
      emit();
    }, VIEW_INCREMENT_DELAY_MS),
  );
}

export function cancelViewIncrement(articleId: number): void {
  const timer = pendingViewTimers.get(articleId);
  if (timer) {
    clearTimeout(timer);
    pendingViewTimers.delete(articleId);
  }
}

/** 좋아요 토글 — 쿨다운으로 연타 방지 */
export function toggleLike(articleId: number): void {
  hydrate();

  if (likeCooldowns.has(articleId)) return;

  const key = toKey(articleId);
  const wasLiked = likedIds.has(articleId);

  if (wasLiked) {
    likedIds = new Set([...likedIds].filter((id) => id !== articleId));
    const next = Math.max(0, (likes[key] ?? 0) - 1);
    likes = { ...likes, [key]: next };
  } else {
    likedIds = new Set(likedIds).add(articleId);
    likes = { ...likes, [key]: (likes[key] ?? 0) + 1 };
  }

  persistLikes();
  emit();

  likeCooldowns.set(
    articleId,
    setTimeout(() => {
      likeCooldowns.delete(articleId);
    }, LIKE_COOLDOWN_MS),
  );
}

export function formatEngagementCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}
