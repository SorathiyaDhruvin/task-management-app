'use client';

import { useAuth } from './AuthProvider';
import Link from 'next/link';
import { LogOut, CheckSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">TaskApp</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  {user.user_metadata.avatar_url && (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.user_metadata.avatar_url}
                      alt={user.user_metadata.full_name || 'Avatar'}
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user.user_metadata.full_name || user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
