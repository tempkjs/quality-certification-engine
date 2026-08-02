/**
 * SCE — report/verdict types (the seam for later deliverables).
 * -------------------------------------------------------------
 * These types define the SHAPE of a certification result without implementing
 * how it's produced. They exist now so the evaluator (Deliverable 6) and the
 * JSON report (Deliverable 7) plug into a settled contract rather than forcing
 * a redesign later.
 *
 * The key architectural commitment they encode: `evaluate` is a PURE function
 * of (results, contract) → report. No I/O, no clock, no filesystem. Same
 * inputs always produce the same verdict — which is what makes a certification
 * reproducible.
 */

import type { QualityContract } from "./schema/quality.schema.js";

/**
 * Normalized evidence gathered from a build. Populated by the ingest layer
 * (Deliverables 5–6) from standard artifacts (JUnit XML for tests, lcov /
 * coverage-summary for coverage) — NOT by integrating a specific test runner.
 */
export interface RawResults {
  tests?: {
    total: number;
    passed: number;
    failed: number;
  };
  coverage?: {
    statements?: number;
    branches?: number;
    functions?: number;
    lines?: number;
  };
}

export type GateStatus = "pass" | "fail";

/** The outcome of a single gate: what was required, what was measured. */
export interface GateOutcome {
  /** Dotted gate id, e.g. `coverage.lines` or `tests.minPassRate`. */
  gate: string;
  status: GateStatus;
  required: number;
  actual: number;
}

/**
 * The full certification result. Later deliverables will extend this with
 * provenance (git SHA of the certified build, tool + versions, a hash of the
 * contract, a timestamp) so a certification can be independently verified.
 */
export interface CertificationReport {
  verdict: GateStatus;
  gates: GateOutcome[];
}

/**
 * The pure evaluation seam — to be implemented in Deliverable 6.
 * Declared as a type here so the eventual implementation must match it.
 */
export type Evaluate = (
  results: RawResults,
  contract: QualityContract
) => CertificationReport;
