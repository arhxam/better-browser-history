export interface RecoverableTab {
  id?: number;
  active?: boolean;
  windowId?: number;
  index?: number;
}

export interface TabsRecoveryApi {
  query: (query: { url: string }) => Promise<RecoverableTab[]>;
  create: (options: { active?: boolean; windowId?: number; index?: number }) => Promise<unknown>;
  remove: (tabId: number) => Promise<void>;
}

/** Replace stale extension-owned New Tab pages after the History-only manifest loads. */
export async function recoverLegacyNewTabs(
  tabs: TabsRecoveryApi,
  recoveryUrl: string,
): Promise<void> {
  const staleTabs = await tabs.query({ url: recoveryUrl });
  for (const tab of staleTabs) {
    if (tab.id == null) continue;
    await tabs.create({
      active: tab.active,
      windowId: tab.windowId,
      index: tab.index,
    });
    await tabs.remove(tab.id);
  }
}
