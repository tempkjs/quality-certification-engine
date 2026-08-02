# Swakojo Certification Engine (SCE)

An internal quality benchmark for software builds. SCE takes a **quality
contract** and a build's test evidence and returns a single, reproducible
verdict: **PASS** or **FAIL**, with the evidence behind it.

SCE is not a testing framework. It is an orchestration-and-verdict layer that
sits on top of proven tools and decides, against an agreed contract, whether a
build is fit to ship.

> **Status: Sprint 1 — contract-loading slice.** SCE can now define a contract,
> load and validate one from disk, and report what it will enforce. It does
> **not** yet run tests or produce a verdict — that stops here, on purpose.

---

## What works today

```bash
pnpm install
pnpm certify .            # loads ./quality.yml (SCE's own contract) and validates it
```

Expected output:

```
SCE — contract loaded
  file:    quality.yml
  version: 1
  project: node
  gates:
    - tests.minPassRate >= 100%
    - coverage.statements >= 80%
    - coverage.branches >= 70%
    - coverage.functions >= 80%
    - coverage.lines >= 80%

Contract is valid. Test execution is not implemented yet (Deliverable 5+).
```

Other commands:

```bash
pnpm certify . --json                 # print the validated contract as JSON
pnpm certify path/to/project          # certify another project's quality.yml
pnpm certify . -c custom-contract.yml # use an explicit contract path
pnpm typecheck                        # tsc, strict, no emit
pnpm test                             # vitest run
```

## Deliverables in this repo

| # | Deliverable | State |
|---|---|---|
| 1 | Quality contract schema (`src/schema/quality.schema.ts`) | done |
| 2 | Canonical `quality.yml` (repo root) | done |
| 3 | `sce certify` command (`src/cli/`) | shell — loads + validates, no verdict |
| 4 | `loadQualityContract()` (`src/loadContract.ts`) | done |
| 5 | Execute unit tests | not started |
| 6 | Read coverage + evaluate → verdict | not started |
| 7 | Generate JSON report (with provenance) | not started |

The `evaluate()` seam for 5–7 is defined as types in `src/report.types.ts` and
marked in `src/cli/certify.ts`, so those deliverables plug in without redesign.

## Architecture (the seams)

Four layers, one hard rule — **evaluation is pure**:

- **Contract** — `schema/quality.schema.ts`: validate an object (no I/O).
- **Load** — `loadContract.ts`: file + YAML → validated contract (the only I/O
  for contracts). Three distinct errors: file / YAML / schema-invalid.
- **Ingest** *(later)* — run tests, read coverage, normalise to `RawResults`
  from **standard artifacts** (JUnit XML, lcov), not a runner integration.
- **Evaluate** *(later)* — `(results, contract) → CertificationReport`. Pure:
  same inputs always produce the same verdict. This is what makes a
  certification reproducible.
- **Report** *(later)* — verdict → JSON with provenance (git SHA, tool
  versions, contract hash, timestamp), plus a non-zero exit on FAIL.

## Design decisions

- **Versioned from day one.** `version` is required; an unknown version fails
  loudly rather than being silently mis-parsed.
- **Strict — typos fail.** Every object rejects unknown keys. `statement`
  instead of `statements` is an error, not a silently-ignored field.
- **Binary gates, not a composite score.** Auditable actual-vs-threshold
  checks; no unwinnable "why is coverage weighted 40%?" arguments.
- **No implicit default contract.** SCE will not certify a project that has no
  contract — a silent default is the same failure mode as strictness-off.
- **Validation is pure; I/O is quarantined in the loader.** One source of
  truth (the Zod schema) drives both the runtime validator and the
  `QualityContract` type, so they can't drift.

## The quality contract

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

## Getting started

**Prerequisites:** Node ≥ 18 and [pnpm](https://pnpm.io) 9.

CI runs `typecheck` and `test` on every push (`.github/workflows/ci.yml`).

## License

**Proprietary — all rights reserved.** SCE is an internal Swakojo asset; this
repository is not open source (`"private": true`, `"license": "UNLICENSED"`).
If the licensing intent ever changes, change it here deliberately.
