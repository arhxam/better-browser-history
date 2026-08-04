// Shared domain types. Kept free of any runtime dependency so the pure core
// stays trivially testable and deterministic.

/** How a navigation was initiated (mirrors chrome.history TransitionType). */
export type TransitionType =
  | 'link'
  | 'typed'
  | 'auto_bookmark'
  | 'auto_subframe'
  | 'manual_subframe'
  | 'generated'
  | 'reload'
  | 'keyword'
  | 'form_submit'
  | 'redirect'
  | 'other';

/** A single navigation event to a URL. */
export interface Visit {
  id: string;
  url: string;
  /** Normalized host, e.g. "news.ycombinator.com". */
  host: string;
  title: string;
  transition: TransitionType;
  /** Referrer URL if known (from document.referrer / navigation). */
  referrer?: string;
  /** id of the visit this one navigated from, if resolvable. */
  referringVisitId?: string;
  tabId: number;
  /** tab that opened this tab (chrome.tabs.openerTabId), enables journeys. */
  openerTabId?: number;
  /** epoch millis. */
  timestamp: number;
  /** Assigned by the sessionizer (derived, deterministic). */
  sessionId?: string;
}

/** Captured content for a URL — the substrate for full-text search. */
export interface Page {
  /** Normalized URL, primary key. */
  url: string;
  host: string;
  title: string;
  /** Extracted visible text (capped). */
  content: string;
  description?: string;
  /** Deterministic token list derived from title + content. */
  tokens: string[];
  lastCapturedAt: number;
}

/** Engagement events recorded while a visit is in the foreground. */
export type EngagementEventType = 'focus' | 'blur' | 'idle' | 'active' | 'heartbeat' | 'unload';

export interface EngagementEvent {
  type: EngagementEventType;
  timestamp: number;
  /** Scroll depth 0..1 at the time of the event (heartbeat/unload). */
  scrollDepth?: number;
}

/** Aggregated engagement for a visit (derived, deterministic). */
export interface Engagement {
  visitId: string;
  /** Total foreground active milliseconds. */
  activeMs: number;
  /** Max scroll depth reached, 0..1. */
  scrollDepth: number;
}

/** User annotations keyed by normalized URL. */
export interface Annotation {
  url: string;
  tags: string[];
  note: string;
  starred: boolean;
  updatedAt: number;
}

/** A browsing session — a run of visits with no large idle gap. */
export interface Session {
  id: string;
  start: number;
  end: number;
  visitIds: string[];
}

/** A node in a referrer/opener journey tree. */
export interface JourneyNode {
  visitId: string;
  children: JourneyNode[];
}

export interface Journey {
  sessionId: string;
  roots: JourneyNode[];
}

/** A deduped URL entry with visit frequency. */
export interface DedupedEntry {
  url: string;
  host: string;
  title: string;
  visitCount: number;
  firstSeen: number;
  lastSeen: number;
  visitIds: string[];
}

/** Search result with a deterministic score. */
export interface SearchResult {
  url: string;
  score: number;
}
