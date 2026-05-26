export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  ai_summary: string | null;
  source: string;
  published_at: string;
  image_url: string | null;
  credibility_score: number | null;
  credibility_label: string | null;
  is_analyzed: boolean;
}

export interface DifficultTerm {
  term: string;
  category?: string;
  definition?: string;
  explanation?: string;
  description?: string;
}

export interface KeyPerson {
  name: string;
  role?: string;
  description: string;
  relation?: string;
}

export interface CredibilityData {
  score: number | null;
  label: string | null;
  reason: string | null;
  red_flags: string[];
  summary: string;
}

export interface AnalysisData {
  credibility: CredibilityData;
  difficult_terms: DifficultTerm[];
  key_persons: KeyPerson[];
}

export interface NewsDetail extends NewsItem {
  url: string;
  content?: string;
  credibility_reason: string | null;
  red_flags: string[] | null;
  difficult_terms: DifficultTerm[] | null;
  key_persons: KeyPerson[] | null;
  comic_script: string | null;
}

export interface ComicScene {
  url: string;
  caption?: string;
}

export interface CartoonItem {
  news_id: number;
  title: string;
  source?: string;
  summary?: string;
  comic_urls: (ComicScene | string)[];
  published_at: string;
}

