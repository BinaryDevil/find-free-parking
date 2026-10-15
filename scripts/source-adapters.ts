import type { SourceAdapter } from './source-sync.ts';

// Registration is code integration only. The runner independently requires a
// matching human-approved evidence_sources row. No real source is approved here.
export const sourceAdapters: SourceAdapter[] = [];
