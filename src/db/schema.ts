// IndexedDB schema (Dexie). Works in the service worker, extension pages, and
// any ordinary tab (the demo/dev mode relies on the latter).
//
// Sessions, journeys and analytics are intentionally NOT stored — they are
// derived deterministically from `visits` at query time, so `visits` stays the
// single source of truth.
import Dexie, { type Table } from 'dexie';
import type { Visit, Page, Engagement, Annotation } from '../core/types';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class HistoryDB extends Dexie {
  visits!: Table<Visit, string>;
  pages!: Table<Page, string>;
  engagement!: Table<Engagement, string>;
  annotations!: Table<Annotation, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'better-browser-history') {
    super(name);
    this.version(1).stores({
      // *tokens is a multiEntry index enabling fast full-text candidate lookup.
      visits: 'id, timestamp, host, url, tabId, sessionId',
      pages: 'url, host, lastCapturedAt, *tokens',
      engagement: 'visitId',
      annotations: 'url, starred, updatedAt, *tags',
      meta: 'key',
    });
  }
}

let singleton: HistoryDB | null = null;

/** Shared DB instance for the current context. */
export function getDB(): HistoryDB {
  if (!singleton) singleton = new HistoryDB();
  return singleton;
}

/** Test/helper hook to inject a fresh DB (e.g. fake-indexeddb). */
export function setDB(db: HistoryDB): void {
  singleton = db;
}
