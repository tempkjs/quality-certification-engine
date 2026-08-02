/**
 * SCE — public API surface.
 *
 * Sprint 1 slice: the quality-contract schema (Deliverable 1), the contract
 * loader (Deliverable 4), and the report/verdict types (the seam for the
 * evaluator and JSON report in later deliverables).
 */

// Schema + validation (pure)
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

// Loader (impure I/O)
export {
  loadQualityContract,
  ContractFileError,
  ContractParseError,
} from "./loadContract.js";

// Report/verdict seam (types only for now)
export type {
  RawResults,
  GateStatus,
  GateOutcome,
  CertificationReport,
  Evaluate,
} from "./report.types.js";
