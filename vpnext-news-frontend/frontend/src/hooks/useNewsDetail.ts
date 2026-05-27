import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SOURCE_NAME_MAP } from "../constants/source";
import { fetchNewsDetail, analyzeNews, generateComic } from "../services/newsService";
import { storage, STORAGE_KEYS } from "../utils/storage";
import { useToast } from "../context/ToastContext";
import type { NewsDetail, AnalysisData } from "../types/news";

type AnalysisStatus = "pending" | "analyzing" | "complete";

// 특정 기사 상세 페이지의 로딩, AI 분석, AI 4컷 만화 생성을 제어하는 훅
export function useNewsDetail() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // AI 분석 상태 ("pending": 미분석, "analyzing": 분석중, "complete": 완료)
  const [status, setStatus] = useState<AnalysisStatus>("pending");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

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

  // 페이지 진입 시 기사 상세 데이터 로드 및 기존 분석/만화 데이터 매핑
  useEffect(() => {
    const loadNewsDetailData = async () => {
      if (!id) return;
      try {
        const data = await fetchNewsDetail(id);
        setNews(data);
        
        // 이미 백엔드에서 분석이 끝난 뉴스라면 관련 정보를 상태에 넣어줌
        if (data.is_analyzed) {
          setAnalysisData({
            credibility: {
              score: data.credibility_score,
              label: data.credibility_label,
              reason: data.credibility_reason,
              red_flags: data.red_flags || [],
              summary: data.ai_summary || "",
            },
            difficult_terms: data.difficult_terms || [],
            key_persons: data.key_persons || [],
          });
          setStatus("complete");
        }
        // 이미 생성된 만화가 있다면 파싱해서 할당
        if (data.comic_script) {
          try {
            setComicUrls(JSON.parse(data.comic_script));
          } catch (e) {
            console.error("만화 URL 파싱 실패");
          }
        }
      } catch (error) {
        console.error("기사 로드 실패:", error);
        showToast("기사를 불러오는 데 실패했습니다.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadNewsDetailData();
  }, [id]);

  // AI 분석(신뢰도 평가, 단어 요약, 인물 분석) 시작 함수
  const startAnalysis = async () => {
    if (!news?.url || !id) return;
    setStatus("analyzing");
    const sourceKey = news?.source?.toLowerCase();
    const currentSourceName =
      SOURCE_NAME_MAP[sourceKey] ||
      news?.source?.toUpperCase() ||
      "미상(외부 뉴스)";
    try {
      const data = await analyzeNews(news.url, currentSourceName);
      setAnalysisData(data);
      setStatus("complete");
      const updatedData = await fetchNewsDetail(id);
      setNews(updatedData);
      
      // 기사 분석이 완료되면 메인/분석뉴스 목록 페이지의 캐시를 무효화하여 최신 상태로 새로고침되도록 유도
      storage.remove(STORAGE_KEYS.MAIN_NEWS_CACHE);
      storage.remove(STORAGE_KEYS.ANALYZED_NEWS_CACHE);
      
      showToast("기사 분석이 완료되었습니다!", "success");
    } catch (error) {
      showToast("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", "error");
      setStatus("pending");
    }
  };

  // AI 4컷 만화 생성 요청 및 모달용 가상 로딩 바 진행 제어
  const handleGenerateComic = async (promptText?: string) => {
    if (!id) return;
    setIsComicGenerating(true);
    setProgress(0);
    setLoadingStatus("만화 생성을 준비하고 있습니다...");
    
    // 만화 생성이 비동기로 이루어지므로 진행률이 99%에 가까워질수록 증가폭이 완만하게 줄어드는 감속(Decay) 로직 적용
    const interval = setInterval(() => {
      setProgress((prev) => {
        const nextVal = prev + (99 - prev) * 0.05;
        
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
  };

  // 단어 드래그 혹은 수동 검색 시 국어사전/구글로 새 창 이동 검색하는 함수
  const handleTermSearch = (e: React.FormEvent) => {
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
  };

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
