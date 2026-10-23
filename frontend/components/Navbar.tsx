'use client';

import { useAuth } from './AuthProvider';
import Link from 'next/link';
import { LogOut, CheckSquare, PlusCircle } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                  TaskSync
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase block">
                  Workspace
                </span>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  pathname === '/dashboard'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <Link
                  href="/tasks/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  New Task
                </Link>

                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-2.5">
                  {avatarUrl ? (
                    <img
                      className="h-8 w-8 rounded-full ring-2 ring-indigo-100 object-cover"
                      src={avatarUrl}
                      alt={displayName}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xs shadow-xs">
                      {initial}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-700 hidden md:block max-w-[140px] truncate">
                    {displayName}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 focus:outline-none transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
