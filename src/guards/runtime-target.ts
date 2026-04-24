import { RESERVED_SALAMANDER_TARGETS } from "../config/constants.js";

export type RuntimeTargetField = "cwd" | "envPath" | "serviceName";

export interface RuntimeTargetViolation {
  field: RuntimeTargetField;
  reservedValue: string;
}

export interface RuntimeTargetInput {
  cwd: string;
  envPath?: string | undefined;
  serviceName?: string | undefined;
}

export class ReservedTargetError extends Error {
  readonly violations: RuntimeTargetViolation[];

  constructor(violations: RuntimeTargetViolation[]) {
    const reserved = violations
      .map((violation) => `${violation.field}=${violation.reservedValue}`)
      .join(", ");
    super(`HermioneResearchBot cannot use reserved Salamander/OpenClaw target: ${reserved}`);
    this.name = "ReservedTargetError";
    this.violations = violations;
  }
}

export function validateRuntimeTarget(input: RuntimeTargetInput): void {
  const violations: RuntimeTargetViolation[] = [];

  if (normalizePath(input.cwd) === normalizePath(RESERVED_SALAMANDER_TARGETS.workingDirectory)) {
    violations.push({
      field: "cwd",
      reservedValue: RESERVED_SALAMANDER_TARGETS.workingDirectory
    });
  }

  if (
    input.envPath !== undefined &&
    normalizePath(input.envPath) === normalizePath(RESERVED_SALAMANDER_TARGETS.envPath)
  ) {
    violations.push({
      field: "envPath",
      reservedValue: RESERVED_SALAMANDER_TARGETS.envPath
    });
  }

  if (
    input.serviceName !== undefined &&
    normalizeServiceName(input.serviceName) === normalizeServiceName(RESERVED_SALAMANDER_TARGETS.serviceName)
  ) {
    violations.push({
      field: "serviceName",
      reservedValue: RESERVED_SALAMANDER_TARGETS.serviceName
    });
  }

  if (violations.length > 0) {
    throw new ReservedTargetError(violations);
  }
}

function normalizePath(value: string): string {
  const normalized = value.trim().replaceAll("\\", "/").replace(/\/+$/u, "");
  return normalized === "" ? "/" : normalized;
}

function normalizeServiceName(value: string): string {
  return value.trim().toLowerCase();
}
