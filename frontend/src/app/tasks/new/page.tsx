'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User, TaskPriority } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function CreateTaskPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    assigned_to: '',
    due_date: ''
  });

  // Auto-set assigned_to when authUser is available
  useEffect(() => {
    if (authUser && !formData.assigned_to) {
      setFormData(prev => ({ ...prev, assigned_to: authUser.id }));
    }
  }, [authUser]);

  useEffect(() => {
    setUsersLoading(true);
    api.users.list().then(res => {
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        // If API fails, at least add the current user
        if (authUser) {
          setUsers([{
            id: authUser.id,
            email: authUser.email || '',
            full_name: authUser.user_metadata?.full_name || null,
            avatar_url: authUser.user_metadata?.avatar_url || null,
          }]);
        }
      }
    }).catch(() => {
      // Fallback: add current user if API completely fails
      if (authUser) {
        setUsers([{
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || null,
          avatar_url: authUser.user_metadata?.avatar_url || null,
        }]);
      }
    }).finally(() => {
      setUsersLoading(false);
    });
  }, [authUser]);

  // Ensure current user is always in the list
  const displayUsers = (() => {
    if (!authUser) return users;
    const hasCurrentUser = users.some(u => u.id === authUser.id);
    if (hasCurrentUser) return users;
    return [{
      id: authUser.id,
      email: authUser.email || '',
      full_name: authUser.user_metadata?.full_name || null,
      avatar_url: authUser.user_metadata?.avatar_url || null,
    }, ...users];
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        assigned_to: formData.assigned_to,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
      };

      const res = await api.tasks.create(payload);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setError(res.error?.message || 'Failed to create task');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Task</h3>
            <p className="mt-1 text-sm text-gray-500">Assign a new task to a team member.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
            {error && (
              <div className="bg-red-50 p-4 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                id="title"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority <span className="text-red-500">*</span></label>
                <select
                  id="priority"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">Assign To <span className="text-red-500">*</span></label>
                <select
                  id="assigned_to"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border bg-white"
                  value={formData.assigned_to}
                  onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Select a user...</option>
                  {usersLoading ? (
                    <option disabled>Loading users...</option>
                  ) : (
                    displayUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email}{u.id === authUser?.id ? ' (Me)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                id="due_date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                href="/dashboard"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
