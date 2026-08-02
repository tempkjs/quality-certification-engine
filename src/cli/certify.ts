/**
 * `sce certify [projectPath]`
 *
 * Sprint 1 slice: resolve the contract, load + validate it, and report what it
 * will enforce. Test execution and verdict are NOT implemented yet — this
 * command deliberately stops at "the contract is valid".
 */

import path from "node:path";
import type { Command } from "commander";
import {
  loadQualityContract,
  ContractFileError,
  ContractParseError,
} from "../loadContract.js";
import {
  QualityContractError,
  type QualityContract,
} from "../schema/quality.schema.js";

interface CertifyOptions {
  contract?: string;
  json?: boolean;
}

export function registerCertify(program: Command): void {
  program
    .command("certify")
    .description(
      "Load and validate a project's quality contract " +
        "(test execution not yet implemented)"
    )
    .argument("[projectPath]", "path to the project to certify", ".")
    .option(
      "-c, --contract <file>",
      "path to the quality contract (defaults to <projectPath>/quality.yml)"
    )
    .option("--json", "print the validated contract as JSON")
    .action((projectPath: string, opts: CertifyOptions) => {
      const contractPath = opts.contract ?? path.join(projectPath, "quality.yml");

      let contract: QualityContract;
      try {
        contract = loadQualityContract(contractPath);
      } catch (err) {
        printError(err);
        process.exitCode = 1;
        return;
      }

      if (opts.json) {
        process.stdout.write(JSON.stringify(contract, null, 2) + "\n");
        return;
      }

      printContractSummary(contractPath, contract);

      // ── SEAM (Deliverable 5+) ─────────────────────────────────────────────
      // 1. Run the project's tests, emit JUnit XML + lcov.
      // 2. Parse those artifacts into RawResults.
      // 3. evaluate(results, contract) -> CertificationReport.
      // 4. Print verdict; process.exit(1) on FAIL.
      // Not implemented yet.
      process.stdout.write(
        "\nContract is valid. Test execution is not implemented yet " +
          "(Deliverable 5+).\n"
      );
    });
}

function printContractSummary(
  contractPath: string,
  contract: QualityContract
): void {
  const out = process.stdout;
  out.write("SCE — contract loaded\n");
  out.write(`  file:    ${contractPath}\n`);
  out.write(`  version: ${contract.version}\n`);
  out.write(`  project: ${contract.project.type}\n`);
  out.write("  gates:\n");

  if (contract.gates.tests) {
    out.write(
      `    - tests.minPassRate >= ${contract.gates.tests.minPassRate}%\n`
    );
  }
  if (contract.gates.coverage) {
    for (const [metric, threshold] of Object.entries(contract.gates.coverage)) {
      if (threshold) {
        out.write(`    - coverage.${metric} >= ${threshold.min}%\n`);
      }
    }
  }
}

function printError(err: unknown): void {
  const e = process.stderr;
  if (err instanceof QualityContractError) {
    e.write("Error: invalid quality contract:\n");
    for (const issue of err.issues) {
      e.write(`    - ${issue.path || "(root)"}: ${issue.message}\n`);
    }
  } else if (
    err instanceof ContractFileError ||
    err instanceof ContractParseError
  ) {
    e.write(`Error: ${err.message}\n`);
  } else {
    e.write(`Error: unexpected: ${(err as Error).message}\n`);
  }
}
