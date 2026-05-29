import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 쿼리 파라미터나 경로가 바뀔 때 최상단으로 강제 스크롤
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
