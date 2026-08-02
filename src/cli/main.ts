/**
 * SCE command-line entry point.
 *
 * Run in development via: `pnpm certify <path>` (which invokes this through tsx).
 * A compiled `sce` binary is a later concern — for now the CLI runs from source.
 */

import { Command } from "commander";
import { registerCertify } from "./certify.js";

const program = new Command();

program
  .name("sce")
  .description("Swakojo Certification Engine")
  .version("0.0.2");

registerCertify(program);

program.parseAsync(process.argv);
