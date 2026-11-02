export type AppRole = "owner" | "supervisor" | "operator";

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Dueño / Super Admin",
  supervisor: "Encargado / Supervisor",
  operator: "Operador de Planta",
};

export type Permission =
  | "formula:edit"
  | "finance:margins"
  | "finance:costs"
  | "inventory:manage"
  | "water:adjust"
  | "batches:manage"
  | "batches:capture"
  | "users:manage";

const MATRIX: Record<AppRole, Permission[]> = {
  owner: [
    "formula:edit",
    "finance:margins",
    "finance:costs",
    "inventory:manage",
    "water:adjust",
    "batches:manage",
    "batches:capture",
    "users:manage",
  ],
  supervisor: ["finance:costs", "water:adjust", "batches:manage", "batches:capture"],
  operator: ["batches:capture"],
};

/** Highest role wins when a user holds several. */
export function primaryRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("owner")) return "owner";
  if (roles.includes("supervisor")) return "supervisor";
  if (roles.includes("operator")) return "operator";
  return null;
}

export function can(roles: AppRole[], permission: Permission): boolean {
  return roles.some((r) => MATRIX[r].includes(permission));
}
