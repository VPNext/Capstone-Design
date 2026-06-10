import { useCallback, useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 4500;

/** 헤드라인 슬라이더 인덱스·자동재생 (호버 시 일시정지) */
export function useNewsSlider(itemCount: number, intervalMs = DEFAULT_INTERVAL_MS) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex((current) => (itemCount === 0 ? 0 : Math.min(current, itemCount - 1)));
  }, [itemCount]);

  const goTo = useCallback(
    (next: number) => {
      if (itemCount <= 0) return;
      setIndex(((next % itemCount) + itemCount) % itemCount);
    },
    [itemCount],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  useEffect(() => {
    if (itemCount <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % itemCount);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [itemCount, paused, intervalMs]);

  return { index, goTo, next, prev, pause, resume };
}
