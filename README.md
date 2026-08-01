# Swakojo Certification Engine (SCE)

An internal quality benchmark for software builds. SCE takes a **quality
contract** and a build's test evidence and returns a single, reproducible
verdict: **PASS** or **FAIL**, with the evidence behind it.

SCE is not a testing framework. It is an orchestration-and-verdict layer that
sits on top of proven tools and decides, against an agreed contract, whether a
build is fit to ship.

> **Status: Sprint 1 · Deliverable 1.** This repository currently contains
> only the **quality contract schema** — the definition of what a contract is
> and validation that a given contract is well-formed. That's it, on purpose.

---

## What's in here right now

| Path | What it is |
|---|---|
| `src/schema/quality.schema.ts` | The v1 quality-contract schema (Zod) + inferred types + validation helpers. **This is Deliverable 1.** |
| `src/index.ts` | Public API surface. |
| `test/quality.schema.test.ts` | Tests: valid contracts pass, invalid ones fail (including typo detection). |
| `examples/quality.yml` | An illustrative contract, for reference. |

### Deliberately **not** here yet

Per the build order, none of the following exists in this repo, and that is
correct — no scaffolding for future sprints:

- No CLI (`sce certify …`)
- No test execution
- No coverage reading
- No verdict/report generation
- No YAML/file loading (the schema validates in-memory objects; the file
  loader is a later deliverable and will call into this schema)

---

## The quality contract

A contract is the agreement a build must satisfy. Example:

```yaml
version: 1
project:
  type: node
gates:
  tests:
    minPassRate: 100          # every test must pass
  coverage:
    statements: { min: 80 }
    branches:   { min: 70 }
    functions:  { min: 80 }
    lines:      { min: 80 }
```

Each **gate** is a binary check (actual vs. threshold). A build passes only if
every defined gate passes.

## Design decisions

- **Versioned from day one.** `version` is required. This lets the schema
  evolve without breaking existing contracts; an unknown version fails loudly
  rather than being silently mis-parsed.
- **Strict — typos fail.** Every object rejects unknown keys. A contract that
  writes `statement` instead of `statements`, or adds a stray field, is an
  error. For a certification tool, silently ignoring a mis-typed threshold is
  the worst possible behaviour.
- **Binary gates, not a composite score.** Gates report actual-vs-threshold
  pass/fail. There is deliberately no weighted 0–100 "quality score" — binary
  gates are auditable and defensible; a weighted score invites unwinnable
  "why is coverage weighted 40%?" arguments. A gradient can be added later if
  a real need appears.
- **Validation is pure.** The schema validates already-parsed objects with no
  file or YAML I/O. That keeps the highest-risk logic trivially testable and
  reproducible, and cleanly separates it from the loader that will read files.
- **One source of truth for shape and type.** The Zod schema produces both the
  runtime validator and the inferred TypeScript type (`QualityContract`), so
  they can never drift apart.

## Usage

```ts
import { parseQualityContract } from "@swakojo/sce";

// Throws QualityContractError (with a detailed, itemised message) if invalid.
const contract = parseQualityContract({
  version: 1,
  project: { type: "node" },
  gates: { tests: { minPassRate: 100 } },
});
```

Prefer branching over catching? Use the non-throwing variant:

```ts
import { safeParseQualityContract } from "@swakojo/sce";

const result = safeParseQualityContract(input);
if (!result.ok) {
  for (const issue of result.issues) {
    console.error(`${issue.path}: ${issue.message}`);
  }
}
```

## Getting started

**Prerequisites:** Node ≥ 18 and [pnpm](https://pnpm.io) 9.

```bash
pnpm install
pnpm typecheck   # tsc, strict, no emit
pnpm test        # vitest run
```

CI runs `typecheck` and `test` on every push (see `.github/workflows/ci.yml`).

## Roadmap (fixed build order)

1. **Quality contract schema** ← *this deliverable*
2. Canonical `quality.yml`
3. `sce certify` command
4. `loadQualityContract()` (file + YAML → validated contract)
5. Execute unit tests
6. Read coverage
7. Generate JSON report (with provenance: git SHA, tool versions, raw metrics)

## License

**Proprietary — all rights reserved.** SCE is an internal Swakojo asset; this
repository is not open source (`"private": true`, `"license": "UNLICENSED"`).
If the licensing intent ever changes, change it here deliberately.
