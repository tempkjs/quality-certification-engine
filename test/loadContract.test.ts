import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadQualityContract,
  ContractFileError,
  ContractParseError,
} from "../src/loadContract.js";
import { QualityContractError } from "../src/schema/quality.schema.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): string => path.join(here, "fixtures", name);

describe("loadQualityContract", () => {
  it("loads and validates a well-formed contract file", () => {
    const contract = loadQualityContract(fixture("valid.yml"));
    expect(contract.version).toBe(1);
    expect(contract.gates.tests?.minPassRate).toBe(100);
    expect(contract.gates.coverage?.lines?.min).toBe(80);
  });

  it("throws ContractFileError when the file is missing", () => {
    expect(() => loadQualityContract(fixture("does-not-exist.yml"))).toThrow(
      ContractFileError
    );
  });

  it("missing-file error states that a contract is required", () => {
    try {
      loadQualityContract(fixture("does-not-exist.yml"));
      throw new Error("expected a throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ContractFileError);
      expect((err as Error).message).toMatch(/will not certify without/i);
    }
  });

  it("throws ContractParseError on invalid YAML", () => {
    expect(() => loadQualityContract(fixture("invalid-yaml.yml"))).toThrow(
      ContractParseError
    );
  });

  it("throws QualityContractError on a schema-invalid contract", () => {
    expect(() => loadQualityContract(fixture("invalid-contract.yml"))).toThrow(
      QualityContractError
    );
  });
});
