import { cleanupExpiredSessions } from "../auth/auth-service.js";

let cleanupInterval: ReturnType<typeof setInterval> | null = null;

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Start the background session cleanup service.
 */
export function startSessionManager() {
  // Run immediately on start
  runCleanup();

  cleanupInterval = setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}

/**
 * Stop the session cleanup service.
 */
export function stopSessionManager() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

async function runCleanup() {
  try {
    const removed = await cleanupExpiredSessions();
    if (removed > 0) {
      console.log(`[clawcrm] Cleaned up ${removed} expired sessions`);
    }
  } catch (err) {
    console.error("[clawcrm] Session cleanup error:", err);
  }
}
