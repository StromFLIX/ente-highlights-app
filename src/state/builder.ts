import { create } from 'zustand';
import type { HighlightDefinition, QualityTerm, ScoringConfig } from '@/api/types';

type BuilderState = {
  initialized: boolean;

  // Filters
  from: number | null;
  to: number | null;
  selYear: number | null; // selected calendar month (UTC), drives from/to
  selMonth: number | null; // 0-based month
  album: string | null;
  people: string[];
  peopleMatch: 'any' | 'all';
  themeEnabled: boolean;
  themeText: string;
  themeThreshold: number;

  // Scoring settings
  qualityWeights: Record<string, number>;
  weightEmbedding: number;
  weightSpace: number;
  weightTime: number;
  method: 'greedy' | 'rerank';
  diversityLambda: number;
  minDistinct: number;
  maxRounds: number;
  elbowTolerance: number;
  topN: number;

  init: (terms: QualityTerm[], config: ScoringConfig) => void;
  patch: (p: Partial<BuilderState>) => void;
  togglePerson: (name: string) => void;
  setMonth: (year: number, month: number) => void;
  clearTime: () => void;
  setWeight: (label: string, value: number) => void;
  resetWeights: (terms: QualityTerm[]) => void;
  buildDefinition: () => HighlightDefinition;
};

export const useBuilder = create<BuilderState>((set, get) => ({
  initialized: false,

  from: null,
  to: null,
  selYear: null,
  selMonth: null,
  album: null,
  people: [],
  peopleMatch: 'any',
  themeEnabled: false,
  themeText: '',
  themeThreshold: 0.18,

  qualityWeights: {},
  weightEmbedding: 0.6,
  weightSpace: 0.2,
  weightTime: 0.2,
  method: 'greedy',
  diversityLambda: 0.5,
  minDistinct: 0.0,
  maxRounds: 8,
  elbowTolerance: 0.1,
  topN: 12,

  init: (terms, config) => {
    if (get().initialized) return;
    const qualityWeights: Record<string, number> = {};
    terms.forEach((t) => (qualityWeights[t.label] = t.defaultWeight));
    set({
      initialized: true,
      qualityWeights,
      weightEmbedding: config.distinctness.embedding,
      weightSpace: config.distinctness.space,
      weightTime: config.distinctness.time,
      method: config.diversity.method,
      diversityLambda: config.diversity.lambda,
      minDistinct: config.diversity.minDistinct,
      maxRounds: config.diversity.maxRounds,
      elbowTolerance: config.diversity.elbowTolerance,
      topN: config.topN,
      themeThreshold: config.themeThreshold,
    });
  },

  patch: (p) => set(p),

  togglePerson: (name) =>
    set((s) => ({
      people: s.people.includes(name)
        ? s.people.filter((p) => p !== name)
        : [...s.people, name],
    })),

  setMonth: (year, month) => {
    const from = Date.UTC(year, month, 1) * 1000;
    const to = Date.UTC(year, month + 1, 1) * 1000;
    set({ selYear: year, selMonth: month, from, to });
  },

  clearTime: () => set({ selYear: null, selMonth: null, from: null, to: null }),

  setWeight: (label, value) =>
    set((s) => ({ qualityWeights: { ...s.qualityWeights, [label]: value } })),

  resetWeights: (terms) => {
    const qualityWeights: Record<string, number> = {};
    terms.forEach((t) => (qualityWeights[t.label] = t.defaultWeight));
    set({ qualityWeights });
  },

  buildDefinition: () => {
    const s = get();
    const themes =
      s.themeEnabled && s.themeText.trim()
        ? s.themeText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : null;
    return {
      filters: {
        from: s.from,
        to: s.to,
        album: s.album,
        person: s.people[0] ?? null,
        people: s.people.length ? s.people : null,
        peopleMatch: s.peopleMatch,
        themes,
        themeThreshold: s.themeThreshold,
      },
      settings: {
        qualityWeights: s.qualityWeights,
        weightEmbedding: s.weightEmbedding,
        weightSpace: s.weightSpace,
        weightTime: s.weightTime,
        diversityLambda: s.diversityLambda,
        minDistinct: s.minDistinct,
        maxRounds: s.maxRounds,
        elbowTolerance: s.elbowTolerance,
        topN: s.topN,
        method: s.method,
      },
    };
  },
}));
