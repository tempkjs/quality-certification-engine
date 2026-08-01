import { describe, it, expect } from "vitest";
import {
  parseQualityContract,
  safeParseQualityContract,
  QualityContractError,
  type QualityContract,
} from "../src/schema/quality.schema.js";

const minimal = {
  version: 1,
  project: { type: "node" },
  gates: { tests: { minPassRate: 100 } },
};

describe("quality contract v1 — valid contracts", () => {
  it("accepts a minimal contract (tests gate only)", () => {
    const c = parseQualityContract(minimal);
    expect(c.version).toBe(1);
    expect(c.gates.tests?.minPassRate).toBe(100);
  });

  it("accepts a full contract (all coverage metrics + tests)", () => {
    const full = {
      version: 1,
      project: { type: "node" },
      gates: {
        coverage: {
          statements: { min: 80 },
          branches: { min: 70 },
          functions: { min: 80 },
          lines: { min: 80 },
        },
        tests: { minPassRate: 100 },
      },
    };
    expect(() => parseQualityContract(full)).not.toThrow();
  });

  it("accepts a coverage-only contract with a single metric", () => {
    const cov = {
      version: 1,
      project: { type: "node" },
      gates: { coverage: { lines: { min: 90 } } },
    };
    expect(() => parseQualityContract(cov)).not.toThrow();
  });
});

describe("quality contract v1 — versioning", () => {
  it("rejects a missing version", () => {
    const noVersion = { project: minimal.project, gates: minimal.gates };
    expect(() => parseQualityContract(noVersion)).toThrow(QualityContractError);
  });

  it("rejects an unknown version", () => {
    expect(() => parseQualityContract({ ...minimal, version: 2 })).toThrow(
      QualityContractError
    );
  });
});

describe("quality contract v1 — strictness catches mistakes", () => {
  it("rejects unknown top-level keys", () => {
    expect(() =>
      parseQualityContract({ ...minimal, extra: true })
    ).toThrow(QualityContractError);
  });

  it("rejects a typo'd coverage metric key ('statement' vs 'statements')", () => {
    const typo = {
      version: 1,
      project: { type: "node" },
      gates: { coverage: { statement: { min: 80 } } },
    };
    expect(() => parseQualityContract(typo)).toThrow();
  });

  it("rejects an unknown project type", () => {
    expect(() =>
      parseQualityContract({ ...minimal, project: { type: "rust" } })
    ).toThrow();
  });
});

describe("quality contract v1 — semantic rules", () => {
  it("rejects a coverage gate with no metrics", () => {
    const empty = {
      version: 1,
      project: { type: "node" },
      gates: { coverage: {} },
    };
    expect(() => parseQualityContract(empty)).toThrow(/at least one metric/);
  });

  it("rejects gates with neither coverage nor tests", () => {
    const empty = {
      version: 1,
      project: { type: "node" },
      gates: {},
    };
    expect(() => parseQualityContract(empty)).toThrow(/at least one gate/);
  });

  it("rejects an out-of-range pass rate (> 100)", () => {
    expect(() =>
      parseQualityContract({
        version: 1,
        project: { type: "node" },
        gates: { tests: { minPassRate: 120 } },
      })
    ).toThrow();
  });

  it("rejects a negative coverage threshold", () => {
    expect(() =>
      parseQualityContract({
        version: 1,
        project: { type: "node" },
        gates: { coverage: { lines: { min: -5 } } },
      })
    ).toThrow();
  });
});

describe("quality contract v1 — validation surface", () => {
  it("safeParse returns structured issues instead of throwing", () => {
    const res = safeParseQualityContract({ version: 2, gates: {} });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues.length).toBeGreaterThan(0);
      expect(res.issues[0]).toHaveProperty("path");
      expect(res.issues[0]).toHaveProperty("message");
    }
  });

  it("QualityContractError carries a readable, itemised message", () => {
    try {
      parseQualityContract({ version: 2, project: { type: "node" }, gates: {} });
      throw new Error("expected parseQualityContract to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(QualityContractError);
      expect((err as QualityContractError).message).toContain(
        "Invalid quality contract"
      );
    }
  });

  it("infers a usable static type", () => {
    // Compile-time smoke test: this literal must satisfy QualityContract.
    const c: QualityContract = {
      version: 1,
      project: { type: "node" },
      gates: { tests: { minPassRate: 100 } },
    };
    expect(c).toBeTruthy();
  });
});
