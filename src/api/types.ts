// Shared API types mirroring the backend JSON shapes.

export type ImageItem = {
  id: string;
  enteFileId: number | null;
  title: string | null;
  album: string | null;
  mediaType: string | null;
  fileSize: number | null;
  creationTimeUs: number | null;
  modificationTimeUs: number | null;
  latitude: number | null;
  longitude: number | null;
  hash: string | null;
  width: number | null;
  height: number | null;
  people: string[];
  faceCount: number | null;
  qualityScore: number | null;
  highlightScore: number | null;
  distinctAdded: number | null;
  rank: number | null;
  clusterId: string | null;
  clusterSize: number | null;
  fullUrl: string; // relative path: /media/{token}/full
  thumbnailUrl: string; // relative path: /media/{token}/thumbnail
};

export type QualityTerm = {
  label: string;
  prompt: string;
  defaultWeight: number;
  positive: boolean;
};

export type QualityTermsResponse = {
  terms: QualityTerm[];
  weightRange: { min: number; max: number; step: number };
};

export type ScoringConfig = {
  distinctness: { embedding: number; space: number; time: number };
  diversity: {
    method: 'greedy' | 'rerank';
    lambda: number;
    minDistinct: number;
    maxRounds: number;
    elbowTolerance: number;
  };
  topN: number;
  themeThreshold: number;
  embedDim: number;
};

export type HighlightFilters = {
  from?: number | null;
  to?: number | null;
  album?: string | null;
  person?: string | null;
  people?: string[] | null;
  peopleMatch?: 'any' | 'all';
  themes?: string[] | null;
  themeThreshold?: number | null;
};

export type HighlightSettings = {
  qualityWeights?: Record<string, number>;
  weightEmbedding?: number;
  weightSpace?: number;
  weightTime?: number;
  diversityLambda?: number;
  minDistinct?: number;
  maxRounds?: number;
  elbowTolerance?: number;
  topN?: number;
  method?: 'greedy' | 'rerank';
};

export type HighlightDefinition = {
  filters: HighlightFilters;
  settings: HighlightSettings;
};

export type PreviewResponse = {
  count: number;
  candidateCount: number;
  items: ImageItem[];
};

export type SavedHighlight = {
  id: string;
  title: string;
  icon: string | null;
  definition: HighlightDefinition;
  coverToken: string | null;
  coverThumbnailUrl: string | null;
  itemCount: number;
  sortOrder: number;
  updatedAtUs: number | null;
};

export type SavedItemsResponse = {
  highlight: SavedHighlight;
  items: ImageItem[];
};

export type Person = { name: string; imageCount: number; coverThumbnailUrl: string };
export type Album = {
  name: string;
  collectionId: number | null;
  imageCount: number;
  coverThumbnailUrl: string;
};

export type SyncStatus = {
  state: string;
  lastSyncUs: number | null;
  lastError: string | null;
  totalImages: number;
  embeddedImages: number;
};
