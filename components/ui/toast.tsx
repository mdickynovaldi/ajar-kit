"use client";

/* AjarKit — toast/snackbar (porting AK.toast). Pakai: const toast = useToast(); toast("Pesan", true) */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Icon } from "./icon";

interface ToastItem {
  id: number;
  msg: string;
  ok: boolean;
  leaving: boolean;
}

type ToastFn = (msg: string, ok?: boolean) => void;

const Ctx = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback<ToastFn>((msg, ok = true) => {
    const id = ++idRef.current;
    setItems((list) => [...list, { id, msg, ok, leaving: false }]);
    setTimeout(() => {
      setItems((list) =>
        list.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      );
      setTimeout(() => {
        setItems((list) => list.filter((t) => t.id !== id));
      }, 300);
    }, 2800);
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast${t.ok ? " ok" : ""}${t.leaving ? " leaving" : ""}`}
          >
            <Icon name={t.ok ? "checkCircle" : "alert"} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(Ctx);
}
