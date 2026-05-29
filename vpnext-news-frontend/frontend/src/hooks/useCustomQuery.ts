import { useState, useEffect, useRef, useCallback } from "react";

// 글로벌 메모리 캐시 데이터 보관소
const queryCache = new Map<string, { data: any; updatedAt: number }>();
const queryPromises = new Map<string, Promise<any>>();
const listeners = new Map<string, Set<() => void>>();

// 캐시 키를 고유한 문자열로 직렬화하는 헬퍼
function serializeKey(key: any[]): string {
  return JSON.stringify(key);
}

// 접두사(Prefix) 기반 캐시 무효화 함수
export const invalidateCustomQueries = (keyPrefix: any[]) => {
  const prefixStr = JSON.stringify(keyPrefix).slice(0, -1); // 대괄호 닫기 ']'를 제거하여 접두사 문자열 생성
  
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

interface CustomQueryOptions<T> {
  queryKey: any[];
  queryFn: () => Promise<T>;
  staleTime?: number; // 캐시 유효 시간 (ms)
}

export function useCustomQuery<T>({
  queryKey,
  queryFn,
  staleTime = 1000 * 60 * 5, // 기본 5분 (stale이 되기 전까지 캐시 사용)
}: CustomQueryOptions<T>) {
  const serializedKey = serializeKey(queryKey);

  // 1. 캐시에 데이터가 있으면 즉시 초기값으로 바인딩하여 깜빡임(CLS/지연) 제거
  const [data, setData] = useState<T | null>(() => {
    const cached = queryCache.get(serializedKey);
    if (cached && Date.now() - cached.updatedAt < staleTime) {
      return cached.data;
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

  const executeFetch = useCallback(async () => {
    let promise = queryPromises.get(serializedKey);

    if (!promise) {
      promise = queryFnRef.current();
      queryPromises.set(serializedKey, promise);

      promise
        .then((result) => {
          queryCache.set(serializedKey, {
            data: result,
            updatedAt: Date.now(),
          });
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
        setData(cached.data);
        setError(null);
      }
    } catch (err) {
      setError(err as Error);
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
        setData(cached.data);
        setLoading(false);
        setError(null);
      } else {
        // 캐시가 비워진 경우 (invalidate)
        setData(null);
        setLoading(true);
        executeFetch();
      }
    };

    listeners.get(serializedKey)!.add(onCacheUpdate);

    // 캐시 유효성 검사 및 페칭 결정
    const cached = queryCache.get(serializedKey);
    const isStale = !cached || (Date.now() - cached.updatedAt > staleTime);

    if (isStale) {
      setLoading(true);
      executeFetch();
    } else {
      setData(cached.data);
      setLoading(false);
      setError(null);
    }

    return () => {
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
    setLoading(true);
    executeFetch();
  }, [serializedKey, executeFetch]);

  return { data, loading, error, refetch };
}
