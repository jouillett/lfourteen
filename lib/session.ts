export const INACTIVITY_LIMIT = 60 * 60 * 1000; // 1 hour (60 minutes)

/**
 * Checks if the current session has exceeded the inactivity limit (1 hour).
 */
export function isSessionExpired(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem("isLoggedIn") !== "true") return false;

  const last = localStorage.getItem("lastActivity");
  if (!last) {
    // If logged in but lastActivity wasn't recorded yet, set it to now
    localStorage.setItem("lastActivity", Date.now().toString());
    return false;
  }

  const lastTime = parseInt(last, 10);
  if (isNaN(lastTime)) {
    return true;
  }

  return Date.now() - lastTime > INACTIVITY_LIMIT;
}

/**
 * Clears all authentication storage (localStorage, sessionStorage, session cookie).
 */
export function clearUserSession() {
  if (typeof window === "undefined") return;

  document.cookie = "session_active=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("customerId");
  localStorage.removeItem("userId");
  localStorage.removeItem("lastActivity");
  localStorage.removeItem("authPhone");
  localStorage.removeItem("customerGrade");
  sessionStorage.removeItem("confidentialAuth");
}

/**
 * Records the current timestamp as the latest user activity.
 */
export function recordSessionActivity() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("isLoggedIn") === "true") {
    localStorage.setItem("lastActivity", Date.now().toString());
  }
}
