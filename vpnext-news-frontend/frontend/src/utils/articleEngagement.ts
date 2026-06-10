/** 브라우저 로컬 저장소 기반 기사 조회수·좋아요 (백엔드 없이 프론트 전용) */

const STORAGE_KEYS = {
  VIEWS: "article_views",
  LIKES: "article_likes",
  LIKED_IDS: "liked_article_ids",
} as const;

const RELOAD_VISIT_KEY = "article_detail_reload_key";

const WRITE_DEBOUNCE_MS = 280;
const LIKE_COOLDOWN_MS = 400;
/** 상세 진입 후 조회수 반영까지 대기 (빠른 이탈·연속 호출 방지) */
const VIEW_INCREMENT_DELAY_MS = 400;

type CountMap = Record<string, number>;

const listeners = new Set<() => void>();

let snapshotVersion = 0;

let views: CountMap = {};
let likes: CountMap = {};
let likedIds = new Set<number>();
let hydrated = false;

const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const likeCooldowns = new Map<number, ReturnType<typeof setTimeout>>();
const pendingViewTimers = new Map<string, ReturnType<typeof setTimeout>>();
const countedVisits = new Set<string>();

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

function visitTimerKey(articleId: number, visitKey: string): string {
  return `${articleId}:${visitKey}`;
}

function visitDedupeKey(articleId: number, visitKey: string): string {
  return `counted:${articleId}:${visitKey}`;
}

/** 새로고침(F5)으로 상세에 머무는 경우만 스킵 — 목록에서 다시 들어오면 visitKey가 달라져 카운트됨 */
function shouldSkipViewIncrement(visitKey: string): boolean {
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  if (nav?.type !== "reload") return false;

  try {
    const reloadVisitKey = sessionStorage.getItem(RELOAD_VISIT_KEY);
    if (!reloadVisitKey) {
      sessionStorage.setItem(RELOAD_VISIT_KEY, visitKey);
      return true;
    }
    return reloadVisitKey === visitKey;
  } catch {
    return false;
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

/**
 * 상세 페이지 진입 시 호출
 * - 목록 등에서 다시 들어올 때마다 증가
 * - 새로고침(reload)으로 같은 상세에 머무는 경우는 제외
 */
export function scheduleViewIncrement(articleId: number, visitKey: string): void {
  hydrate();
  if (shouldSkipViewIncrement(visitKey)) return;

  const timerKey = visitTimerKey(articleId, visitKey);
  const existing = pendingViewTimers.get(timerKey);
  if (existing) clearTimeout(existing);

  pendingViewTimers.set(
    timerKey,
    setTimeout(() => {
      pendingViewTimers.delete(timerKey);
      if (shouldSkipViewIncrement(visitKey)) return;

      const dedupeKey = visitDedupeKey(articleId, visitKey);
      if (countedVisits.has(dedupeKey)) return;
      countedVisits.add(dedupeKey);

      const key = toKey(articleId);
      views = { ...views, [key]: (views[key] ?? 0) + 1 };
      persistViews();
      emit();
    }, VIEW_INCREMENT_DELAY_MS),
  );
}

export function cancelViewIncrement(articleId: number, visitKey: string): void {
  const timerKey = visitTimerKey(articleId, visitKey);
  const timer = pendingViewTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    pendingViewTimers.delete(timerKey);
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
