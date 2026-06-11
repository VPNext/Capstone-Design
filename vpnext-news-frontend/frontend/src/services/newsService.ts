import api from "../api";
import type { AxiosRequestConfig } from "axios";
import type { NewsDetail, NewsItem, AnalysisData, CartoonItem } from "../types/news";

interface FetchNewsResponse {
  items: NewsItem[];
  total: number;
}

export const fetchNewsList = async (
  page: number,
  source?: string,
  isAnalyzed?: boolean,
  keyword?: string,
  size = 30,
  config?: AxiosRequestConfig,
): Promise<FetchNewsResponse> => {
  const sourceParam = source ? `&source=${source}` : "";
  const analyzedParam = isAnalyzed !== undefined ? `&is_analyzed=${isAnalyzed}` : "";
  const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : "";
  const response = await api.get(
    `/api/news?page=${page}&size=${size}${sourceParam}${analyzedParam}${keywordParam}`,
    config,
  );
  return response.data;
};

export const fetchNewsDetail = async (id: number | string, config?: AxiosRequestConfig): Promise<NewsDetail> => {
  const response = await api.get(`/api/news/${id}`, config);
  return response.data;
};

export const analyzeNews = async (
  articleUrl: string,
  sourceName: string,
  config?: AxiosRequestConfig
): Promise<AnalysisData> => {
  const response = await api.post(
    `/api/analyze?article_url=${encodeURIComponent(articleUrl)}&source=${encodeURIComponent(sourceName)}`,
    null,
    config
  );
  return response.data;
};

export const generateComic = async (
  id: number | string,
  customPrompt?: string,
  config?: AxiosRequestConfig
): Promise<{ comic_urls: string[] }> => {
  const payload = customPrompt ? { custom_prompt: customPrompt } : {};
  const response = await api.post(`/api/news/${id}/comic`, payload, config);
  return response.data;
};

export const fetchCartoons = async (config?: AxiosRequestConfig): Promise<CartoonItem[]> => {
  const response = await api.get("/api/cartoons", config);
  return response.data;
};

export const toggleLikeNews = async (
  id: number | string,
  liked: boolean,
  config?: AxiosRequestConfig
): Promise<{ id: number; likes: number }> => {
  const response = await api.post(`/api/news/${id}/like`, { liked }, config);
  return response.data;
};
