/**
 * Toss Payments customerKey generator.
 * Toss Payments requires customerKey to be between 22 and 255 characters (enforced Dec 1, 2026).
 * Allowed characters: a-z, A-Z, 0-9, and (- _ = . @)
 */
export function generateTossCustomerKey(userId?: string | number | null): string {
  if (userId && String(userId) !== "loginid" && String(userId) !== "guest") {
    let hash = 0;
    const str = `lfourteen_salt_${userId}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    // Format: "user_7_454f473f_l14coordysecurekey" (34 chars)
    return `user_${userId}_${hex}_l14coordysecurekey`;
  }

  // Non-logged-in guest format: "guest_1793674053687_a1b2c3d4" (28 chars)
  const rand = Math.random().toString(36).substring(2, 10);
  return `guest_${Date.now()}_${rand}`;
}
