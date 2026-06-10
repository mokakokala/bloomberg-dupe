import { useEffect, useRef, useState } from "react";
import { get } from "./api";

/** Fetch `path` and refetch every `intervalMs` (0 = no polling). */
export function usePoll<T>(path: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setLoading(true);
    setError(null);

    const load = () =>
      get<T>(path)
        .then((d) => {
          if (!alive) return;
          setData(d);
          setError(null);
          setLoading(false);
        })
        .catch((e) => {
          if (!alive) return;
          setError(e.message);
          setLoading(false);
        });

    load();
    const id = intervalMs > 0 ? setInterval(load, intervalMs) : undefined;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [path, intervalMs]);

  return { data, error, loading };
}

/** State persisted to localStorage. */
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
