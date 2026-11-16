import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import type { State, Account } from "./domain/types";
import type { Command } from "./domain/engine";
import { repository, STORAGE_KEY } from "./data/repository";
import { createSeed } from "./data/seed";
interface Context {
  state: State;
  actor: Account;
  busy: boolean;
  error: string;
  setActor: (id: string) => void;
  run: (c: Command) => Promise<boolean>;
  notify: (m: string) => void;
  reload: () => void;
}
const C = createContext<Context | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [loadError, setLoadError] = useState("");
  const [state, setState] = useState<State>(() => {
    try {
      return repository.read();
    } catch (e) {
      return createSeed();
    }
  });
  const [id, setId] = useState(() => {
    const saved = sessionStorage.getItem("pharmalink-account");
    if (!saved || saved === "branch-hadda") {
      sessionStorage.setItem("pharmalink-account", "guest");
      return "guest";
    }
    return saved;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const reload = useCallback(() => {
    try {
      setState(repository.read());
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    reload();
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [reload]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const actor = state.accounts.find((a) => a.id === id) || state.accounts[0];
  async function run(command: Command) {
    if (busy || loadError) {
      setError(loadError || "انتظر اكتمال العملية");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      const next = await repository.execute(actor.id, command);
      setState(next);
      setMessage("تم حفظ العملية محليًا بنجاح");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <C.Provider
      value={{
        state,
        actor,
        busy,
        error,
        setActor: (id) => {
          sessionStorage.setItem("pharmalink-account", id);
          setId(id);
          setError("");
        },
        run,
        notify: setMessage,
        reload,
      }}
    >
      {children}
      {(error || loadError) && (
        <div className="toast-wrap">
          <div role="alert" className="toast error" onClick={() => setError("")}>
            <AlertCircle size={20} className="text-red-300 flex-shrink-0" />
            <span>{error || loadError}</span>
            <button
              className="toast-close"
              aria-label="إغلاق التنبيه"
              onClick={(e) => {
                e.stopPropagation();
                setError("");
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
      {message && (
        <div className="toast-wrap">
          <div role="status" className="toast success" onClick={() => setMessage("")}>
            <CheckCircle2 size={20} className="text-teal-300 flex-shrink-0" />
            <span>{message}</span>
            <button
              className="toast-close"
              aria-label="إغلاق التنبيه"
              onClick={(e) => {
                e.stopPropagation();
                setMessage("");
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </C.Provider>
  );
}
export function useApp() {
  const c = useContext(C);
  if (!c) throw new Error("Provider missing");
  return c;
}
