// Messages exchanged between the content script and the service worker.
import type { EngagementEvent, Page, Visit } from '../core/types';

export interface PageContentMessage {
  type: 'PAGE_CONTENT';
  url: string;
  title: string;
  content: string;
  description?: string;
}

export interface EngagementMessage {
  type: 'ENGAGEMENT';
  url: string;
  events: EngagementEvent[];
}

export interface GetCaptureStateMessage {
  type: 'GET_CAPTURE_STATE';
}

export interface SetCaptureStateMessage {
  type: 'SET_CAPTURE_STATE';
}

export interface CaptureStateMessage {
  type: 'CAPTURE_STATE';
  enabled: boolean;
}

export interface CaptureStateResponse {
  enabled: boolean;
}

export type ContentMessage = PageContentMessage
  | EngagementMessage
  | GetCaptureStateMessage
  | SetCaptureStateMessage
  | CaptureStateMessage;

// UI <-> service worker query bridge (used when running as an extension page;
// the dev/demo UI talks to IndexedDB directly instead).
export interface QueryRequest {
  type: 'QUERY';
  method: string;
  args: unknown[];
}

export interface QueryResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export type { EngagementEvent, Page, Visit };
