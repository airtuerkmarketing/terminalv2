// Shared types for the Wissensbasis (/admin/knowledge) admin surface.
//
// Naming (D-065): "Wissensbasis" with tabs Quellen / Reviews / Qualität /
// Taxonomie. The corpus spans 3 real stores (company_context, confluence_chunks,
// brand_chunks); ai_corrections is the review inbox, not a chunk layer (K-2).

export type ChunkLayer = "company" | "confluence" | "brand";
export type RetrievalSource = "context" | "confluence" | "brand";
export type ContentShape = "quote" | "table" | "bullets" | "prose";
export type TagAxis = "topic" | "airline" | "department" | "provider" | "brand";

export const TAG_AXES: readonly TagAxis[] = [
  "topic",
  "airline",
  "department",
  "provider",
  "brand",
] as const;

/** Tag assignment shape stored on company_context.tags (plural keys per axis). */
export interface ChunkTags {
  topics?: string[];
  airlines?: string[];
  departments?: string[];
  providers?: string[];
  brands?: string[];
}

/** Map a TagAxis to its plural key inside ChunkTags. */
export const AXIS_TO_KEY: Record<TagAxis, keyof ChunkTags> = {
  topic: "topics",
  airline: "airlines",
  department: "departments",
  provider: "providers",
  brand: "brands",
};

/** A unified corpus row, normalised across the 3 stores (idea-2 at the query layer). */
export interface KnowledgeChunk {
  uid: string; // `${layer}:${id}` — stable client key
  layer: ChunkLayer;
  source: RetrievalSource; // for the chunk_retrieval_stats join
  id: string; // native id as text (uuid for company, bigint for chunks)
  sourceType: string; // page|pdf|office|correction|knowledge_base|brand|<category>
  title: string;
  content: string; // preview-truncated for the list; full text via getCompanyContextChunk
  truncated: boolean;
  tags: ChunkTags;
  tokenCount: number | null;
  hasEmbedding: boolean;
  priority: number | null;
  createdAt: string;
  retrievedCount: number; // "Abgerufen ×N" — retrieval, not citation (B-3)
  editable: boolean; // true only for the company layer (D-A)
}

export type CorrectionStatus = "pending" | "approved" | "edited_approved" | "rejected";
export type CorrectionType = "factual_error" | "missing_info" | "outdated" | "context_wrong";

export const CORRECTION_TYPE_LABEL: Record<CorrectionType, string> = {
  factual_error: "Fakten-Fehler",
  missing_info: "Fehlende Information",
  outdated: "Veraltet",
  context_wrong: "Falscher Kontext",
};

export interface CorrectionRow {
  id: string;
  status: CorrectionStatus;
  correctionType: CorrectionType;
  originalQuestion: string;
  originalAnswer: string;
  proposedCorrection: string;
  finalContent: string | null;
  userReference: string | null;
  submittedById: string | null;
  submittedByName: string | null;
  submittedAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  appliedToChunkId: number | null;
}

export interface KnowledgeStats {
  totalChunks: number;
  byLayer: { company: number; confluence: number; brand: number };
  sourceTypeCounts: Record<string, number>;
  pendingReviews: number;
  approvedCorrections: number;
  lastEmbeddingRun: string | null;
  goldSetPct: number;
  topicCount: number;
  entityCount: number;
}

export interface VocabTerm {
  id: string;
  axis: TagAxis;
  value: string;
  labelDe: string;
  labelEn: string | null;
  aliases: string[];
  description: string | null;
  citedCount: number;
  approvedAt: string | null;
  parentId: string | null;
}

export interface TagSuggestion {
  id: string;
  axis: TagAxis;
  suggestedValue: string;
  sourceChunkId: string | null;
  sourceChunkTable: string | null;
  contextExcerpt: string | null;
  status: "pending" | "approved" | "rejected" | "merged";
  createdAt: string;
}

export interface ChunkEditLogEntry {
  id: string;
  chunkTable: string;
  chunkId: string;
  editedByName: string | null;
  editReason: string;
  diffBefore: string | null;
  diffAfter: string | null;
  tagsBefore: ChunkTags | null;
  tagsAfter: ChunkTags | null;
  sourceCorrectionId: string | null;
  createdAt: string;
}

export interface QualityStats {
  overallPct: number;
  total: number;
  correct: number;
  bySet: Array<{ testSet: string; total: number; correct: number; pct: number }>;
  failures: Array<{ frageNr: number | null; frage: string; testSet: string }>;
}

export type ChunkSort = "newest" | "oldest" | "most-retrieved";

/** Filter state synced to the URL (?layer=&topic=&search=&sort=). */
export interface KnowledgeFilters {
  layers: ChunkLayer[];
  sourceTypes: string[];
  topics: string[];
  airlines: string[];
  departments: string[];
  providers: string[];
  brands: string[];
  search: string;
  sort: ChunkSort;
}

export const EMPTY_FILTERS: KnowledgeFilters = {
  layers: [],
  sourceTypes: [],
  topics: [],
  airlines: [],
  departments: [],
  providers: [],
  brands: [],
  search: "",
  sort: "newest",
};
