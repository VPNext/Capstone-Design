import { useState, useEffect, useRef, useCallback } from "react";

// 글로벌 메모리 캐시 데이터 보관소
const queryCache = new Map<string, { data: unknown; updatedAt: number }>();
const queryPromises = new Map<string, Promise<unknown>>();
const listeners = new Map<string, Set<() => void>>();

// --- IndexedDB Cache Helper ---
const DB_NAME = "antigravity_query_cache";
const STORE_NAME = "cache";
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setIndexedDBCache(key: string, data: unknown, updatedAt: number): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, data, updatedAt });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB write failed:", err);
  }
}

async function getIndexedDBCache(key: string): Promise<{ data: unknown; updatedAt: number } | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) {
          resolve({ data: request.result.data, updatedAt: request.result.updatedAt });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("IndexedDB read failed:", err);
    return null;
  }
}

async function deleteIndexedDBCache(key: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IndexedDB delete failed:", err);
  }
}

async function invalidateIndexedDBCache(keyPrefix: readonly unknown[]): Promise<void> {
  try {
    const prefixStr = JSON.stringify(keyPrefix).slice(0, -1);
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const key = cursor.key as string;
        if (key.startsWith(prefixStr)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (err) {
    console.error("IndexedDB prefix invalidate failed:", err);
  }
}
// ------------------------------

// 캐시 키를 고유한 문자열로 직렬화하는 헬퍼
function serializeKey(key: readonly unknown[]): string {
  return JSON.stringify(key);
}

// 접두사(Prefix) 기반 캐시 무효화 함수
export const invalidateCustomQueries = (keyPrefix: readonly unknown[]) => {
  const prefixStr = JSON.stringify(keyPrefix).slice(0, -1); // 대괄호 닫기 ']'를 제거하여 접두사 문자열 생성
  
  // IndexedDB 동기화 비우기
  invalidateIndexedDBCache(keyPrefix);

  for (const serializedKey of Array.from(queryCache.keys())) {
    if (serializedKey.startsWith(prefixStr)) {
      queryCache.delete(serializedKey);
      // 등록된 모든 리스너들에게 강제 리프레시 전파
      const set = listeners.get(serializedKey);
      if (set) {
        set.forEach((listener) => listener());
      }
    }
  }
};

// 백그라운드 선제적 캐싱(프리패치) 함수
export function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  staleTime = 1000 * 60 * 5
) {
  const serializedKey = serializeKey(queryKey);
  const cached = queryCache.get(serializedKey);
  const isStale = !cached || (Date.now() - cached.updatedAt > staleTime);

  if (!isStale) return;

  let promise = queryPromises.get(serializedKey) as Promise<T> | undefined;

  if (!promise) {
    promise = queryFn();
    queryPromises.set(serializedKey, promise);

    promise
      .then((result) => {
        const updatedAt = Date.now();
        queryCache.set(serializedKey, {
          data: result,
          updatedAt,
        });
        setIndexedDBCache(serializedKey, result, updatedAt);
        queryPromises.delete(serializedKey);
        
        // 등록된 리스너 컴포넌트들에게 최신 데이터가 반영되었음을 고지
        const set = listeners.get(serializedKey);
        if (set) {
          set.forEach((listener) => listener());
        }
      })
      .catch((err) => {
        queryPromises.delete(serializedKey);
        console.warn("프리패치 요청 실패:", serializedKey, err);
      });
  }
}

interface CustomQueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  staleTime?: number; // 캐시 유효 시간 (ms)
}

export function useCustomQuery<T>({
  queryKey,
  queryFn,
  staleTime = 1000 * 60 * 5, // 기본 5분 (stale이 되기 전까지 캐시 사용)
}: CustomQueryOptions<T>) {
  const serializedKey = serializeKey(queryKey);

  // 1. 메모리 캐시에 데이터가 있으면 즉시 초기값으로 바인딩하여 깜빡임(CLS/지연) 제거
  const [data, setData] = useState<T | null>(() => {
    const cached = queryCache.get(serializedKey);
    if (cached && Date.now() - cached.updatedAt < staleTime) {
      return cached.data as T;
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    const cached = queryCache.get(serializedKey);
    if (cached && Date.now() - cached.updatedAt < staleTime) {
      return false;
    }
    return true;
  });

  const [error, setError] = useState<Error | null>(null);

  // 현재 실행 중인 queryFn의 최신 주소 유지용 Ref (stale closure 방지)
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  // 캐시 데이터 갱신 시 등록된 컴포넌트 리스너들에 변경 사항 전파
  const notifyListeners = useCallback((key: string) => {
    const set = listeners.get(key);
    if (set) {
      set.forEach((listener) => listener());
    }
  }, []);

  const executeFetch = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    let promise = queryPromises.get(serializedKey) as Promise<T> | undefined;

    if (!promise) {
      promise = queryFnRef.current();
      queryPromises.set(serializedKey, promise);

      promise
        .then((result) => {
          const updatedAt = Date.now();
          queryCache.set(serializedKey, {
            data: result,
            updatedAt,
          });
          // IndexedDB 영구 저장
          setIndexedDBCache(serializedKey, result, updatedAt);

          queryPromises.delete(serializedKey);
          notifyListeners(serializedKey);
        })
        .catch(() => {
          queryPromises.delete(serializedKey);
          notifyListeners(serializedKey);
        });
    }

    try {
      await promise;
      const cached = queryCache.get(serializedKey);
      if (cached) {
        setData(cached.data as T);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [serializedKey, notifyListeners]);

  useEffect(() => {
    // 이 컴포넌트를 이 캐시 키의 리스너로 등록
    if (!listeners.has(serializedKey)) {
      listeners.set(serializedKey, new Set());
    }
    
    const onCacheUpdate = () => {
      const cached = queryCache.get(serializedKey);
      if (cached) {
        setData(cached.data as T);
        setLoading(false);
        setError(null);
      } else {
        // 캐시가 비워진 경우 (invalidate)
        setData(null);
        setLoading(true);
        executeFetch(true);
      }
    };

    listeners.get(serializedKey)!.add(onCacheUpdate);

    let active = true;

    // 비동기 캐시 체크 및 페치 실행 흐름 제어 (IndexedDB 선제 로드 및 SWR 실현)
    const initAndFetch = async () => {
      let cached = queryCache.get(serializedKey);

      // 1. 메모리 캐시가 비어 있는 경우, IndexedDB에서 캐시 데이터를 먼저 확인
      if (!cached) {
        const idbCached = await getIndexedDBCache(serializedKey);
        if (idbCached && active) {
          cached = idbCached;
          queryCache.set(serializedKey, cached);
          setData(cached.data as T);
          setLoading(false);
        }
      }

      if (!active) return;

      // 2. 캐시 유효성 검사 및 페칭 결정
      const isStale = !cached || (Date.now() - cached.updatedAt > staleTime);

      if (isStale) {
        // IndexedDB 복구 데이터 또는 메모리 캐시 데이터가 있으면 스피너를 표시하지 않음 (Stale-While-Revalidate)
        const hasData = !!cached;
        executeFetch(!hasData);
      } else {
        setData(cached.data as T);
        setLoading(false);
        setError(null);
      }
    };

    initAndFetch();

    return () => {
      active = false;
      const set = listeners.get(serializedKey);
      if (set) {
        set.delete(onCacheUpdate);
        if (set.size === 0) {
          listeners.delete(serializedKey);
        }
      }
    };
  }, [serializedKey, staleTime, executeFetch]);

  // 캐시 강제 무효화 및 refetch 함수
  const refetch = useCallback(() => {
    queryCache.delete(serializedKey);
    deleteIndexedDBCache(serializedKey);
    setLoading(true);
    executeFetch(true);
  }, [serializedKey, executeFetch]);

  return { data, loading, error, refetch };
}

// 캐시 데이터 수동 업데이트 및 리스너 전파 헬퍼 함수
export function setCustomQueryData<T>(
  queryKey: readonly unknown[],
  updater: (prev: T | null) => T
) {
  const serializedKey = JSON.stringify(queryKey);
  const cached = queryCache.get(serializedKey);
  const prevData = cached ? (cached.data as T) : null;
  const nextData = updater(prevData);
  const updatedAt = Date.now();

  queryCache.set(serializedKey, {
    data: nextData,
    updatedAt,
  });

  // IndexedDB 저장 동기화
  setIndexedDBCache(serializedKey, nextData, updatedAt);

  // 해당 키를 구독하고 있는 리스너 컴포넌트들에게 강제 갱신 전파
  const set = listeners.get(serializedKey);
  if (set) {
    set.forEach((listener) => listener());
  }
}

