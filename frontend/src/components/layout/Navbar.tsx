"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "./SearchBar";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await signOut();
    setDropdownOpen(false);
    router.push("/");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/50 glass">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors">
                StockSignal
              </span>
            </Link>
            <div className="hidden md:block">
              <SearchBar />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/portfolio"
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
            >
              Portfolio
            </Link>
            <Link
              href="/watchlist"
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
            >
              Watchlist
            </Link>
            <Link
              href="/methodology"
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
            >
              Methodology
            </Link>

            {user ? (
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700/50 border border-slate-700/50 transition-all"
                >
                  <span className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xs font-medium">
                    {user.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl py-1 shadow-2xl">
                    <Link
                      href="/portfolio"
                      className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Portfolio
                    </Link>
                    <Link
                      href="/watchlist"
                      className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Watchlist
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/50 hover:text-white transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Settings
                    </Link>
                    <hr className="my-1 border-slate-800" />
                    <button
                      onClick={handleSignOut}
                      className="block w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-800/50 hover:text-red-300 transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="ml-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/20 transition-all"
              >
                Login
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-slate-800/50 pt-4">
            <div className="py-2">
              <SearchBar />
            </div>
            <Link
              href="/portfolio"
              className="block py-2.5 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
            >
              Portfolio
            </Link>
            <Link
              href="/watchlist"
              className="block py-2.5 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
            >
              Watchlist
            </Link>
            <Link
              href="/methodology"
              className="block py-2.5 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
            >
              Methodology
            </Link>
            {user ? (
              <>
                <Link
                  href="/settings"
                  className="block py-2.5 px-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg"
                >
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left py-2.5 px-3 text-sm text-red-400 hover:bg-slate-800/50 rounded-lg"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block py-2.5 px-3 text-sm text-white font-medium"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
