// src/types/index.ts
export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  age: number | null;
  favorite_team: string | null;
  favorite_national_team: string | null;
  role: 'admin' | 'user';
  onboarding_completed: boolean;
  // ─── Controle de Acesso ───
  access_type?: 'trial' | 'weekly' | 'monthly' | 'yearly' | 'lifetime' | 'free' | 'blocked';
  access_days?: number;
  access_started_at?: string;
  access_expires_at?: string;
  is_active?: boolean;
  // ─── Fim Controle de Acesso ───
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  title: string;
  sport_type: string;
  championship: string | null;
  description: string | null;
  image_url: string | null;
  is_hot: boolean;
  is_featured: boolean;
  status: 'pending' | 'green' | 'red';
  display_type: 'image' | 'structured';
  stake_value: number | null;
  bookmaker_name: string | null;
  bookmaker_link: string | null;
  odds: number | null;
  match_date: string | null;
  fixture_id: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  matches?: AnalysisMatch[];
  user_bet?: UserBet | null;
  bet?: AnalysisBet | null;
}

export interface AnalysisMatch {
  id: string;
  analysis_id: string;
  home_team: string;
  away_team: string;
  league: string | null;
  bet_type: string;
  odds: number | null;
  match_time: string | null;
}

export interface AnalysisBet {
  id: string;
  analysis_id: string;
  bookmaker_name: string;
  bookmaker_url: string;
  bet_type: 'simples' | 'multipla';
  stake_value: number | null;
  total_odds: number | null;
  notes: string | null;
  status: 'active' | 'expired' | 'won' | 'lost';
  created_at: string;
  updated_at: string;
  selections?: AnalysisBetSelection[];
}

export interface AnalysisBetSelection {
  id: string;
  bet_id: string;
  home_team: string;
  away_team: string;
  league: string | null;
  match_time: string | null;
  market: string;
  selection: string;
  odds: number | null;
  sort_order: number;
  created_at: string;
}

export interface UserBet {
  id: string;
  user_id: string;
  analysis_id: string;
  did_bet: boolean;
  result_status: 'pending' | 'green' | 'red';
  profit_loss: number;
  created_at: string;
}

export interface Bonus {
  id: string;
  title: string;
  description: string | null;
  how_it_works: string | null;
  website_url: string | null;
  image_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface DailyPlanItem {
  day: number;
  date: string;
  planned_amount: number;
  planned_profit: number;
  result_amount: number | null;
  status: 'pending' | 'done';
}

export interface Bankroll {
  id: string;
  user_id: string;
  total_amount: number;
  days: number;
  target_type: 'percentage' | 'fixed';
  target_value: number;
  daily_plan: DailyPlanItem[];
  current_balance: number;
  total_profit: number;
  roi: number;
  hit_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface DailyResult {
  id: string;
  user_id: string;
  bankroll_id: string;
  day: number;
  date: string;
  result_amount: number;
  notes: string | null;
  created_at: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  category: string;
  is_featured: boolean;
  is_auto: boolean | null;
  source_name: string | null;
  source_url: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SupportConfig {
  id: string;
  telegram_link: string | null;
  whatsapp_link: string | null;
  support_text: string;
  is_active: boolean;
}

// ─── App Settings (Controle Global) ───
export interface AppSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}