import { create } from 'zustand';
import { MetricEntry, MetricType, DateRange } from '../types';
import { sqliteAdapter } from '../storage/sqlite';

interface MetricsState {
  entries: MetricEntry[];
  isLoading: boolean;
  error: string | null;
  userId: string | null;

  // Actions
  setUserId: (id: string | null) => void;
  loadEntries: (filter?: { metric_type?: MetricType; dateRange?: DateRange }) => Promise<void>;
  addEntry: (entry: Omit<MetricEntry, 'id'>) => Promise<MetricEntry>;
  deleteEntry: (id: string) => Promise<void>;
  getLatestEntry: (metric_type: MetricType) => Promise<MetricEntry | null>;
  getEntriesByType: (metric_type: MetricType) => MetricEntry[];
  clearError: () => void;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,
  userId: null,

  setUserId: (id) => {
    sqliteAdapter.setUser(id);
    // On logout (id === null), drop in-memory entries immediately to avoid
    // leaking previous user's data to the logged-out UI.
    if (id === null) {
      set({ userId: null, entries: [], error: null });
    } else {
      // Switched users — clear stale entries; caller should loadEntries next.
      const prev = get().userId;
      if (prev !== id) {
        set({ userId: id, entries: [], error: null });
      } else {
        set({ userId: id });
      }
    }
  },

  loadEntries: async (filter) => {
    if (!get().userId) {
      set({ entries: [], isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      sqliteAdapter.setUser(get().userId);
      const entries = await sqliteAdapter.getEntries(filter);
      set({ entries, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addEntry: async (entry) => {
    set({ isLoading: true, error: null });
    try {
      sqliteAdapter.setUser(get().userId);
      const newEntry = await sqliteAdapter.addEntry(entry);
      set((state) => ({
        entries: [newEntry, ...state.entries],
        isLoading: false,
      }));
      return newEntry;
    } catch (e) {
      set({ error: String(e), isLoading: false });
      throw e;
    }
  },

  deleteEntry: async (id) => {
    set({ isLoading: true, error: null });
    try {
      sqliteAdapter.setUser(get().userId);
      await sqliteAdapter.deleteEntry(id);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (e) {
      set({ error: String(e), isLoading: false });
      throw e;
    }
  },

  getLatestEntry: async (metric_type) => {
    try {
      sqliteAdapter.setUser(get().userId);
      return await sqliteAdapter.getLatestEntry(metric_type);
    } catch (e) {
      set({ error: String(e) });
      return null;
    }
  },

  getEntriesByType: (metric_type) => {
    return get().entries.filter((e) => e.metric_type === metric_type);
  },

  clearError: () => set({ error: null }),
}));
