/**
 * Default policy definitions.
 * "deny-all": no cross-user access, only own data.
 * "allow-own": same as deny-all but explicitly marked.
 */

export type PolicyType = "deny-all" | "allow-own";

/**
 * Evaluate if a request matches default policy.
 * Own-data access is always allowed regardless of policy.
 */
export function evaluateDefaultPolicy(
  policy: PolicyType,
  userId: string,
  dataOwnerId: string | null,
): boolean {
  // Own data is always accessible
  if (dataOwnerId && userId === dataOwnerId) return true;

  // Under both policies, cross-user access requires explicit permission
  return false;
}
