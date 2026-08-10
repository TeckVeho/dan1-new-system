"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { getCustomers } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

type CustomerSearchSelectProps = {
  value: string;
  onChange: (customerId: string, customer?: Customer) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function CustomerSearchSelect({
  value,
  onChange,
  placeholder = "施設名・番号で検索",
  className,
  disabled,
}: CustomerSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadSelected = useCallback(async (id: string) => {
    if (!id) {
      setSelectedLabel("");
      return;
    }
    try {
      const res = await getCustomers({ search: id, page: 1, pageSize: 20 });
      const match = res.items.find((c) => c.id === id) ?? res.items[0];
      if (match) setSelectedLabel(`${match.customerCode} ${match.name}`);
    } catch {
      setSelectedLabel(id);
    }
  }, []);

  useEffect(() => {
    loadSelected(value);
  }, [value, loadSelected]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getCustomers({ search: query || undefined, page: 1, pageSize: 20 });
        setOptions(res.items);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : selectedLabel}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          className="h-8 w-full rounded-md border border-border bg-white pl-8 pr-2 text-[13px] outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 disabled:bg-bg"
        />
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white shadow-md">
          {loading ? (
            <p className="px-3 py-2 text-[12px] text-muted">検索中…</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-muted">該当する施設がありません</p>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {options.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-[13px] hover:bg-bg",
                      c.id === value && "bg-primary/5 text-primary",
                    )}
                    onClick={() => {
                      onChange(c.id, c);
                      setSelectedLabel(`${c.customerCode} ${c.name}`);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{c.customerCode}</span>
                    <span className="ml-2 text-muted">{c.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
