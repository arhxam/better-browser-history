import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { HistoryDB, setDB } from '../src/db/schema';
import {
  getAllVisits,
  importAll,
  recordVisit,
} from '../src/db/repository';

let dbCounter = 0;
beforeEach(async () => {
  const db = new HistoryDB(`import_test_${dbCounter++}`);
  setDB(db);
  await db.open();
  await recordVisit({
    id: 'existing',
    url: 'https://existing.example/',
    tabId: 1,
    timestamp: 100,
  });
});

describe('history import', () => {
  it('rejects an invalid bundle without changing existing data', async () => {
    await expect(importAll({ visits: 'not-an-array' })).rejects.toThrow('Invalid import file');
    expect((await getAllVisits()).map((visit) => visit.id)).toEqual(['existing']);
  });

  it('merges a valid bundle without clearing existing records', async () => {
    const result = await importAll({
      version: 1,
      exportedAt: '2026-08-07T00:00:00.000Z',
      visits: [{
        id: 'imported',
        url: 'https://imported.example/',
        host: 'imported.example',
        title: 'Imported',
        transition: 'typed',
        tabId: 2,
        timestamp: 200,
      }],
      pages: [],
      engagement: [],
      annotations: [],
    });

    expect(result).toEqual({ visits: 1, pages: 0, engagement: 0, annotations: 0 });
    expect((await getAllVisits()).map((visit) => visit.id)).toEqual(['existing', 'imported']);
  });
});
