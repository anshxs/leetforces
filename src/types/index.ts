export interface ExtensionSettings {
  cf_leetcode_theme?: boolean;
  cf_hide_tags?: boolean;
  cf_show_timer?: boolean;
}

export interface CodeforcesAuthStatus {
  isSignedIn: boolean;
  handle: string;
  profileUrl: string;
  logoutUrl: string;
}

export interface CodeforcesUserProfile {
  handle: string;
  avatarUrl?: string;
  rating?: number;
  rank?: string;
}

export interface ProblemTag {
  name: string;
  url: string;
}

export interface ProblemMetaItem {
  tags: ProblemTag[];
  rating?: number;
}

export interface ProblemRowMeta {
  row: HTMLTableRowElement;
  id: string;
  title: string;
  rating: number | null;
  difficultyCategory: 'EASY' | 'MEDIUM' | 'HARD' | 'UNRATED';
  isSolved: boolean;
  problemUrl: string;
}

export interface DOMContestItem {
  id: string;
  name: string;
  url: string;
  phaseText: string;
  isRunning: boolean;
  isRegistration: boolean;
  countdownText: string;
  countdownId: string;
  regUrl: string;
}

