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
      try {
        const detail = (event as CustomEvent).detail;
        const options = JSON.parse(detail.challenge);

        // Use WebAuthn browser API
        const credential = await startAuthentication({ optionsJSON: options });

        // Send credential to server
        sendAuthVerify(credential);

        // Wait for auth:success or auth:error
        const onSuccess = () => {
          cleanup();
          resolve();
        };
        const onError = (e: Event) => {
          cleanup();
          reject(new Error((e as CustomEvent).detail.message));
        };
        const cleanup = () => {
          window.removeEventListener("clawcrm:auth:error", onError);
        };
        window.addEventListener("clawcrm:auth:error", onError, { once: true });

        // Auth success is handled by store update, resolve immediately
        // since the store listener in the Login page will react
        setTimeout(resolve, 100);
      } catch (err) {
        cleanup();
        reject(err);
      }

      function cleanup() {
        window.removeEventListener("clawcrm:auth:challenge", onChallenge);
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
