import api from "../api";
import type { NewsDetail, NewsItem, AnalysisData, CartoonItem } from "../types/news";

interface FetchNewsResponse {
  items: NewsItem[];
  total: number;
}

export const fetchNewsList = async (
  page: number,
  source?: string,
  isAnalyzed?: boolean,
  keyword?: string
): Promise<FetchNewsResponse> => {
  const sourceParam = source ? `&source=${source}` : "";
  const analyzedParam = isAnalyzed !== undefined ? `&is_analyzed=${isAnalyzed}` : "";
  const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
  const response = await api.get(`/api/news?page=${page}${sourceParam}${analyzedParam}${keywordParam}`);
  return response.data;
};

export const fetchNewsDetail = async (id: number | string): Promise<NewsDetail> => {
  const response = await api.get(`/api/news/${id}`);
  return response.data;
};

export const analyzeNews = async (articleUrl: string, sourceName: string): Promise<AnalysisData> => {
  const response = await api.post(
    `/api/analyze?article_url=${encodeURIComponent(articleUrl)}&source=${encodeURIComponent(sourceName)}`
  );
  return response.data;
};

export const generateComic = async (id: number | string, customPrompt?: string): Promise<{ comic_urls: string[] }> => {
  const payload = customPrompt ? { custom_prompt: customPrompt } : {};
  const response = await api.post(`/api/news/${id}/comic`, payload);
  return response.data;
};

export const fetchCartoons = async (): Promise<CartoonItem[]> => {
  const response = await api.get("/api/cartoons");
  return response.data;
};
