import { useState, useEffect } from "react";
import { connect } from "../lib/ws-client.js";
import { loginWithPasskey } from "../lib/auth.js";
import { useStore } from "../lib/store.js";

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const connected = useStore((s) => s.connected);

  useEffect(() => {
    connect();
  }, []);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithPasskey();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ClawCRM
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Melde dich mit deinem Passkey an
            </p>
          </div>

          {!connected && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm">
              Verbindung wird hergestellt...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !connected}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <span>🔐</span>
                Mit Passkey anmelden
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-6">
            Kein Passwort noetig. Dein Geraet authentifiziert dich sicher.
          </p>
        </div>
      </div>
    </div>
  );
}
