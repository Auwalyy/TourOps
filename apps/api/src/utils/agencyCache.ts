/**
 * Short-lived cache of agency records for the per-request access checks
 * (subscription gate, plan features). Without it every API call re-reads the
 * agency from the database before doing any real work.
 *
 * Entries are dropped by the Agency model's save/update hooks, so a payment,
 * extension or suspension takes effect on the very next request; the TTL only
 * bounds changes made outside Mongoose (e.g. directly in the database).
 *
 * Callers must treat cached records as read-only.
 */
const TTL_MS = 30 * 1000;
const MAX_ENTRIES = 1000;

const entries = new Map<string, { value: unknown; at: number }>();

export const agencyCache = {
  get<T>(id: string): T | undefined {
    const hit = entries.get(id);
    if (!hit) return undefined;
    if (Date.now() - hit.at > TTL_MS) {
      entries.delete(id);
      return undefined;
    }
    return hit.value as T;
  },

  set(id: string, value: unknown) {
    if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value as string);
    entries.set(id, { value, at: Date.now() });
  },

  invalidate(id: unknown) {
    if (id) entries.delete(String(id));
  },

  clear() {
    entries.clear();
  },
};
