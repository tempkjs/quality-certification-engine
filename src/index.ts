/**
 * SCE — public API surface.
 *
 * Sprint 1 · Deliverable 1 exposes only the quality-contract schema and its
 * validation helpers. Later deliverables (loader, runners, evaluator, report)
 * will extend this barrel.
 */

export {
  qualityContractSchema,
  parseQualityContract,
  safeParseQualityContract,
  QualityContractError,
} from "./schema/quality.schema.js";

export type {
  QualityContract,
  Gates,
  CoverageGate,
  TestsGate,
  ContractIssue,
} from "./schema/quality.schema.js";
