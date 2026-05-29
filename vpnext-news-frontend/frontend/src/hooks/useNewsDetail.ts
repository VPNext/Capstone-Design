import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { SOURCE_NAME_MAP } from "../constants/source";
import { fetchNewsDetail, analyzeNews, generateComic } from "../services/newsService";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { useToast } from "../context/ToastContext";
import { useCustomQuery, invalidateCustomQueries } from "./useCustomQuery";
import type { NewsDetail, AnalysisData } from "../types/news";

type AnalysisStatus = "pending" | "analyzing" | "complete";

// 특정 기사 상세 페이지의 로딩, AI 분석, AI 4컷 만화 생성을 제어하는 훅
export function useNewsDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  
  // 1. useCustomQuery 선언형 상세 캐시 적용 (10분 보존)
  const { data: news, loading } = useCustomQuery<NewsDetail>({
    queryKey: ["newsDetail", id],
    queryFn: () => fetchNewsDetail(id!),
    staleTime: 1000 * 60 * 10,
  });

  // 분석 중(API 통신 중) 상태 관리
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 실시간 기사 상태 평가
  const status: AnalysisStatus = useMemo(() => {
    if (isAnalyzing) return "analyzing";
    return news?.is_analyzed ? "complete" : "pending";
  }, [isAnalyzing, news?.is_analyzed]);

  // news 객체로부터 실시간 파생 (Computed Value) - useMemo로 불필요한 재연산 방지
  const analysisData: AnalysisData | null = useMemo(() => {
    if (!news || !news.is_analyzed) return null;
    return {
      credibility: {
        score: news.credibility_score,
        label: news.credibility_label,
        reason: news.credibility_reason,
        red_flags: news.red_flags || [],
        summary: news.ai_summary || "",
      },
      difficult_terms: news.difficult_terms || [],
      key_persons: news.key_persons || [],
    };
  }, [news]);

  // 4컷 만화 생성용 상태값
  const [isComicGenerating, setIsComicGenerating] = useState(false);
  const [comicUrls, setComicUrls] = useState<string[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("");

  // 유저가 직접 입력하는 화풍/커스텀 프롬프트
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  // 단어 검색용 상태값
  const [searchTerm, setSearchTerm] = useState("");
  const [searchEngine, setSearchEngine] = useState("stdict");

  // 페이지 진입 또는 기사 ID 변경 시 로컬 일회성 상태 초기화
  useEffect(() => {
    setComicUrls(null);
    setProgress(0);
    setLoadingStatus("");
    setShowPromptInput(false);
    setCustomPrompt("");
    setSearchTerm("");
    setIsAnalyzing(false);

    if (news?.comic_script) {
      try {
        setComicUrls(JSON.parse(news.comic_script));
      } catch (e) {
        console.error("만화 URL 파싱 실패");
      }
    }
  }, [id, news?.comic_script]);

  // AI 분석(신뢰도 평가, 단어 요약, 인물 분석) 시작 함수
  const startAnalysis = useCallback(async () => {
    if (!news?.url || !id) return;
    setIsAnalyzing(true);
    const sourceKey = news?.source?.toLowerCase();
    const currentSourceName =
      SOURCE_NAME_MAP[sourceKey] ||
      news?.source?.toUpperCase() ||
      "미상(외부 뉴스)";
    try {
      // AI 분석 요청 전송
      await analyzeNews(news.url, currentSourceName);
      
      // 기사 상세 및 뉴스 목록 캐시 무효화 -> 리프레시 선언적 촉발
      invalidateCustomQueries(["newsDetail", id]);
      invalidateCustomQueries(["newsList"]);
      
      // 구형 스토리지 세션 캐시 무효화 보완
      storage.remove(STORAGE_KEYS.MAIN_NEWS_CACHE);
      storage.remove(STORAGE_KEYS.ANALYZED_NEWS_CACHE);
      
      showToast("기사 분석이 완료되었습니다!", "success");
    } catch (error) {
      showToast("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [news?.url, news?.source, id, showToast]);

  // AI 4컷 만화 생성 요청 및 가상 로딩 바 진행 제어
  const handleGenerateComic = useCallback(async (promptText?: string) => {
    if (!id) return;
    setIsComicGenerating(true);
    setProgress(0);
    setLoadingStatus("만화 생성을 준비하고 있습니다...");
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        const nextVal = prev + (97 - prev) * 0.05;
        
        if (nextVal < 30) {
          setLoadingStatus("뉴스를 분석하여 만화 시나리오를 작성하고 있습니다...");
        } else if (nextVal < 80) {
          setLoadingStatus("AI 컷 이미지를 순차적으로 생성하고 있습니다... (약 30초 소요)");
        } else {
          setLoadingStatus("말풍선 위치를 정렬하고 만화 컷을 최종 보정하고 있습니다...");
        }
        
        return nextVal;
      });
    }, 500);
    
    try {
      const res = await generateComic(id, promptText);
      setProgress(100);
      setLoadingStatus("만화 생성 완료!");
      await new Promise((resolve) => setTimeout(resolve, 800));
      setComicUrls(res.comic_urls);
      
      // 상세 정보 캐시 갱신 (만화 목록 연동을 위해)
      invalidateCustomQueries(["newsDetail", id]);
      
      showToast("4컷 만화가 성공적으로 생성되었습니다!", "success");
    } catch (error) {
      console.error("만화 생성 오류:", error);
      showToast("만화 생성 중 오류가 발생했습니다. 다시 시도해 주세요.", "error");
      setLoadingStatus("오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } finally {
      clearInterval(interval);
      setIsComicGenerating(false);
    }
  }, [id, showToast]);

  // 단어 드래그 혹은 수동 검색 시 국어사전/구글로 새 창 이동 검색하는 함수
  const handleTermSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    let url = "";
    if (searchEngine === "stdict")
      url = `https://stdict.korean.go.kr/search/searchResult.do?pageSize=10&searchKeyword=${encodeURIComponent(searchTerm)}`;
    else if (searchEngine === "opendict")
      url = `https://opendict.korean.go.kr/search/searchResult?query=${encodeURIComponent(searchTerm)}`;
    else if (searchEngine === "google")
      url = `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`;
    window.open(url, "_blank");
  }, [searchTerm, searchEngine]);

  return {
    id,
    news,
    loading,
    status,
    analysisData,
    isComicGenerating,
    comicUrls,
    progress,
    loadingStatus,
    showPromptInput,
    customPrompt,
    searchTerm,
    searchEngine,
    setShowPromptInput,
    setCustomPrompt,
    setSearchTerm,
    setSearchEngine,
    startAnalysis,
    handleGenerateComic,
    handleTermSearch,
  };
}
