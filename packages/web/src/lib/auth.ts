import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { requestAuthChallenge, sendAuthVerify } from "./ws-client.js";

/**
 * Initiate the passkey login flow.
 * 1. Request challenge from server via WebSocket
 * 2. Browser shows passkey prompt
 * 3. Send credential back to server
 */
export async function loginWithPasskey(): Promise<void> {
  return new Promise((resolve, reject) => {
    const onChallenge = async (event: Event) => {
      const cleanupAll = () => {
        window.removeEventListener("clawcrm:auth:challenge", onChallenge);
      };

      try {
        const detail = (event as CustomEvent).detail;
        const options = JSON.parse(detail.challenge);

        const credential = await startAuthentication({ optionsJSON: options });
        sendAuthVerify(credential);

        const onError = (e: Event) => {
          cleanupAll();
          reject(new Error((e as CustomEvent).detail.message));
        };
        window.addEventListener("clawcrm:auth:error", onError, { once: true });

        // Store listener in Login page reacts to auth:success
        setTimeout(resolve, 100);
      } catch (err) {
        cleanupAll();
        reject(err);
      }
    };

    window.addEventListener("clawcrm:auth:challenge", onChallenge, {
      once: true,
    });

    // Trigger the flow
    requestAuthChallenge();

    // Timeout
    setTimeout(() => {
      window.removeEventListener("clawcrm:auth:challenge", onChallenge);
      reject(new Error("Authentication timeout"));
    }, 60_000);
  });
}
