export const STORAGE_KEYS = {
  MAIN_NEWS_CACHE: "main_news_cache",
  MAIN_NEWS_SCROLL: "main_news_scroll",
  ANALYZED_NEWS_CACHE: "analyzed_news_cache",
  ANALYZED_NEWS_SCROLL: "analyzed_news_scroll",
} as const;

export const storage = {
  set: <T>(key: string, value: T): void => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving to sessionStorage [key: ${key}]:`, e);
    }
  },
  get: <T>(key: string, fallback: T): T => {
    const data = sessionStorage.getItem(key);
    if (!data) return fallback;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error parsing sessionStorage [key: ${key}]:`, e);
      return fallback;
    }
  },
  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },
  clear: (): void => {
    sessionStorage.clear();
  },
};
