import { loadConfig } from "../src/config/env.js";
import { ReservedTargetError, validateRuntimeTarget } from "../src/guards/runtime-target.js";

try {
  const config = loadConfig(process.env);

  validateRuntimeTarget({
    cwd: process.env.HERMIONE_WORKING_DIRECTORY ?? process.cwd(),
    envPath: config.envFilePath,
    serviceName: config.serviceName
  });

  console.log("Hermione deploy target preflight passed.");
} catch (error) {
  console.error(`Hermione deploy target preflight failed: ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof ReservedTargetError) {
    for (const violation of error.violations) {
      console.error(`- ${violation.field}: ${violation.reservedValue}`);
    }
  }
  process.exit(1);
}
