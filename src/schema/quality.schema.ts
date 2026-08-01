/**
 * SCE — Quality Contract Schema (v1)
 * ----------------------------------
 * The quality contract is the agreement a build must satisfy before SCE
 * issues a PASS. This module defines that contract as a single Zod schema,
 * which gives us BOTH runtime validation and the inferred TypeScript type
 * from one source of truth.
 *
 * Deliberate design decisions (see README for the reasoning):
 *   - `version` is present from day one so the schema can evolve without
 *     breaking existing contracts. An unknown version fails loudly rather
 *     than being silently mis-parsed.
 *   - Every object is `.strict()`: an unknown or mis-typed key is an ERROR,
 *     not a silently-ignored field. For a certification tool, a typo like
 *     `statement` instead of `statements` must fail, not pass by accident.
 *   - Gates are binary (actual vs. threshold), not folded into a single
 *     composite 0-100 score. Binary gates are auditable and defensible;
 *     a weighted score invites "why is coverage weighted 40%?" arguments.
 *   - This module is PURE: it validates already-parsed objects. Reading a
 *     file and parsing YAML is the loader's job (a later deliverable), which
 *     will call into this. Keeping validation free of I/O keeps it trivially
 *     testable and reproducible.
 */

import { z } from "zod";

/** A percentage: a number in [0, 100]. Reused by coverage mins and pass rate. */
const percentage = z
  .number({ invalid_type_error: "must be a number" })
  .min(0, "must be >= 0")
  .max(100, "must be <= 100");

/** A single coverage threshold, e.g. `{ min: 80 }`. */
const coverageThreshold = z.object({ min: percentage }).strict();

/**
 * The coverage gate. Each Istanbul metric is optional so a contract can
 * require any subset, but at least one metric must be present — an empty
 * coverage gate is meaningless and is rejected.
 */
const coverageGateSchema = z
  .object({
    statements: coverageThreshold.optional(),
    branches: coverageThreshold.optional(),
    functions: coverageThreshold.optional(),
    lines: coverageThreshold.optional(),
  })
  .strict()
  .refine(
    (c) => Boolean(c.statements || c.branches || c.functions || c.lines),
    {
      message:
        "coverage gate must define at least one metric (statements, branches, functions, lines)",
    }
  );

/**
 * The tests gate. `minPassRate` is a percentage; 100 means every test must
 * pass (zero tolerance for failures), which is the sensible default.
 */
const testsGateSchema = z
  .object({
    minPassRate: percentage,
  })
  .strict();

/**
 * The set of gates a contract enforces. Both are optional individually, but
 * a contract with no gates certifies nothing and is rejected.
 */
const gatesSchema = z
  .object({
    coverage: coverageGateSchema.optional(),
    tests: testsGateSchema.optional(),
  })
  .strict()
  .refine((g) => Boolean(g.coverage || g.tests), {
    message: "at least one gate must be defined (coverage or tests)",
  });

/** Project descriptor. Only `node` is supported in v1; the enum grows later. */
const projectSchema = z
  .object({
    type: z.enum(["node"]),
  })
  .strict();

/** The top-level v1 quality contract. */
export const qualityContractSchema = z
  .object({
    version: z.literal(1),
    project: projectSchema,
    gates: gatesSchema,
  })
  .strict();

// ---- Inferred types (single source of truth: the schema above) ----

export type QualityContract = z.infer<typeof qualityContractSchema>;
export type Gates = z.infer<typeof gatesSchema>;
export type CoverageGate = z.infer<typeof coverageGateSchema>;
export type TestsGate = z.infer<typeof testsGateSchema>;

// ---- Validation surface ----

/** A single, human-readable validation problem: where, and what's wrong. */
export interface ContractIssue {
  /** Dotted path to the offending field, e.g. `gates.coverage.lines.min`. */
  path: string;
  message: string;
}

/**
 * Thrown by {@link parseQualityContract} when a contract is invalid. Carries
 * a structured list of issues so a caller (or a vendor report) can show
 * exactly what must be fixed — not just "invalid".
 */
export class QualityContractError extends Error {
  readonly issues: ContractIssue[];

  constructor(issues: ContractIssue[]) {
    super(
      "Invalid quality contract:\n" +
        issues.map((i) => `  - ${i.path || "(root)"}: ${i.message}`).join("\n")
    );
    this.name = "QualityContractError";
    this.issues = issues;
  }
}

function toIssues(error: z.ZodError): ContractIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Validate an already-parsed object against the v1 contract schema.
 *
 * Pure: no file or YAML I/O. Reading and YAML-parsing a `quality.yml` is the
 * loader's responsibility (a later deliverable); the loader will call this.
 *
 * @throws {QualityContractError} if the object is not a valid contract.
 */
export function parseQualityContract(input: unknown): QualityContract {
  const result = qualityContractSchema.safeParse(input);
  if (!result.success) {
    throw new QualityContractError(toIssues(result.error));
  }
  return result.data;
}

/**
 * Non-throwing variant of {@link parseQualityContract}. Returns either the
 * validated contract or the list of issues, so callers that prefer to branch
 * on a result (rather than catch) can do so.
 */
export function safeParseQualityContract(
  input: unknown
):
  | { ok: true; contract: QualityContract }
  | { ok: false; issues: ContractIssue[] } {
  const result = qualityContractSchema.safeParse(input);
  return result.success
    ? { ok: true, contract: result.data }
    : { ok: false, issues: toIssues(result.error) };
}
