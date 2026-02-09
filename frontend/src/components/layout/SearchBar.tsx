"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchStocks } from "@/lib/api";
import type { SearchResult } from "@/types";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 1) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await searchStocks(query);
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    setIsOpen(false);
    setQuery("");
    router.push(`/stock/${result.symbol}?exchange=${result.exchange}`);
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks by name or ticker..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-gray-500 focus:outline-none"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">No results found</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={`${r.symbol}-${r.exchange}`}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <div>
                      <span className="font-medium text-gray-900">
                        {r.symbol}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {r.name}
                      </span>
                    </div>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {r.exchange}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
