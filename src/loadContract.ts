/**
 * SCE — contract loader (impure I/O layer).
 * -----------------------------------------
 * Reads a `quality.yml` from disk, parses the YAML, and validates it against
 * the pure schema. This is the ONLY place file/YAML I/O happens for contracts;
 * validation logic itself stays pure in `schema/quality.schema.ts`.
 *
 * Three distinct failure modes, each with its own error type so callers can
 * respond precisely:
 *   - ContractFileError  — the file can't be read (missing, permissions, …).
 *   - ContractParseError — the file isn't valid YAML.
 *   - QualityContractError — valid YAML, but not a valid contract (from schema).
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import {
  parseQualityContract,
  type QualityContract,
} from "./schema/quality.schema.js";

/** The contract file could not be read. */
export class ContractFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractFileError";
  }
}

/** The contract file was read but is not valid YAML. */
export class ContractParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractParseError";
  }
}

/**
 * Load, parse, and validate a quality contract from a file path.
 *
 * @throws {ContractFileError}     if the file cannot be read.
 * @throws {ContractParseError}    if the file is not valid YAML.
 * @throws {QualityContractError}  if the parsed object is not a valid contract.
 */
export function loadQualityContract(filePath: string): QualityContract {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      throw new ContractFileError(
        `No quality contract found at ${filePath}. ` +
          `SCE will not certify without an explicit contract.`
      );
    }
    throw new ContractFileError(
      `Could not read contract at ${filePath}: ${e.message}`
    );
  }

  let data: unknown;
  try {
    data = parseYaml(raw);
  } catch (err) {
    throw new ContractParseError(
      `Contract at ${filePath} is not valid YAML: ${(err as Error).message}`
    );
  }

  // Pure validation — throws QualityContractError with itemised issues.
  return parseQualityContract(data);
}
