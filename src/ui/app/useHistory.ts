import { useCallback, useEffect, useState } from 'react';
import {
  getEntries,
  searchEntries,
  getAnalytics,
  getSessions,
  getJourneys,
  getAllHosts,
  getAllTags,
  setAnnotation,
  type EnrichedEntry,
  type HistoryFilter,
  type AnalyticsBundle,
  type SessionView,
} from '../../db/repository';
import type { Journey } from '../../core/types';

export interface HistoryState {
  query: string;
  setQuery: (q: string) => void;
  filter: HistoryFilter;
  setFilter: (f: HistoryFilter) => void;
  entries: EnrichedEntry[];
  analytics: AnalyticsBundle | null;
  sessions: SessionView[];
  journeys: Journey[];
  hosts: string[];
  tags: string[];
  loading: boolean;
  reload: () => Promise<void>;
  toggleStar: (url: string, starred: boolean) => Promise<void>;
  saveAnnotation: (url: string, tags: string[], note: string, starred: boolean) => Promise<void>;
}

export function useHistory(initialFilter: HistoryFilter = {}): HistoryState {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>(initialFilter);
  const [entries, setEntries] = useState<EnrichedEntry[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsBundle | null>(null);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [hosts, setHosts] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const tz = -new Date().getTimezoneOffset(); // minutes east of UTC
    const q = query.trim();
    const [e, a, s, j, h, t] = await Promise.all([
      q ? searchEntries(q, filter) : getEntries(filter),
      getAnalytics(filter, tz),
      getSessions(filter),
      getJourneys(filter),
      getAllHosts(),
      getAllTags(),
    ]);
    setEntries(e);
    setAnalytics(a);
    setSessions(s);
    setJourneys(j);
    setHosts(h);
    setTags(t);
    setLoading(false);
  }, [query, filter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggleStar = useCallback(
    async (url: string, starred: boolean) => {
      await setAnnotation(url, { starred }, Date.now());
      await reload();
    },
    [reload],
  );

  const saveAnnotation = useCallback(
    async (url: string, tagList: string[], note: string, starred: boolean) => {
      await setAnnotation(url, { tags: tagList, note, starred }, Date.now());
      await reload();
    },
    [reload],
  );

  return {
    query,
    setQuery,
    filter,
    setFilter,
    entries,
    analytics,
    sessions,
    journeys,
    hosts,
    tags,
    loading,
    reload,
    toggleStar,
    saveAnnotation,
  };
}
