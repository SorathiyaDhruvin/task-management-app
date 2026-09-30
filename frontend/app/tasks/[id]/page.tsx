'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Task } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle2, Trash2, Clock, Calendar, User, ArrowLeft } from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const taskId = params.id as string;
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const [res, subRes] = await Promise.all([
        api.tasks.get(taskId),
        api.tasks.list({ parent_id: taskId })
      ]);
      
      if (res.success && res.data) {
        setTask(res.data);
      } else {
        setError(res.error?.message || 'Failed to load task');
      }

      if (subRes.success && subRes.data) {
        setSubtasks(subRes.data);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const res = await api.tasks.complete(task.id);
      if (res.success && res.data) {
        setTask(res.data);
      } else {
        alert(res.error?.message || 'Failed to complete task');
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Are you sure you want to delete this task?')) return;
    setActionLoading(true);
    try {
      const res = await api.tasks.delete(task.id);
      if (res.success) {
        router.push('/dashboard');
      } else {
        alert(res.error?.message || 'Failed to delete task');
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;
  if (error) return <div className="min-h-screen flex justify-center items-center text-red-600">{error}</div>;
  if (!task) return <div className="min-h-screen flex justify-center items-center">Task not found</div>;

  const isCreator = user?.id === task.created_by;
  const isAssignee = user?.id === task.assigned_to;
  const canComplete = (isCreator || isAssignee) && task.status !== 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
            <div>
              <h3 className="text-2xl leading-6 font-bold text-gray-900">{task.title}</h3>
              <div className="mt-2 flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 
                    task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                  {task.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {task.priority} Priority
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {canComplete && (
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:bg-green-400"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </button>
              )}
              {isCreator && (
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none disabled:bg-gray-100"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {task.description || 'No description provided.'}
                </dd>
              </div>

              {task.parent_id && (
                <div className="sm:col-span-2 bg-blue-50 p-3 rounded-md">
                  <dt className="text-sm font-medium text-blue-800">Part of Parent Task</dt>
                  <dd className="mt-1 text-sm">
                    <Link href={`/tasks/${task.parent_id}`} className="text-blue-600 hover:underline">
                      View Parent Task
                    </Link>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1"><User className="w-4 h-4"/> Assigned To</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {task.assigned_to_profile?.full_name || task.assigned_to_profile?.email || 'Unassigned'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1"><User className="w-4 h-4"/> Created By</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {task.created_by_profile?.full_name || task.created_by_profile?.email || 'Unknown'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1"><Calendar className="w-4 h-4"/> Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-1"><Clock className="w-4 h-4"/> Created At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(task.created_at).toLocaleString()}
                </dd>
              </div>
              
              {task.completed_at && (
                <div className="sm:col-span-2 bg-green-50 p-3 rounded-md">
                  <dt className="text-sm font-medium text-green-800 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Completed At</dt>
                  <dd className="mt-1 text-sm text-green-900">
                    {new Date(task.completed_at).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Subtasks Section */}
        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Subtasks</h3>
            <Link
              href={`/tasks/new?parent_id=${task.id}`}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Subtask
            </Link>
          </div>
          
          {subtasks.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No subtasks found.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {subtasks.map((subtask) => (
                <li key={subtask.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <Link href={`/tasks/${subtask.id}`} className="text-sm font-medium text-blue-600 truncate hover:underline">
                      {subtask.title}
                    </Link>
                    <div className="ml-2 flex-shrink-0 flex gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                        ${subtask.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          subtask.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {subtask.status.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                        ${subtask.priority === 'high' ? 'bg-red-100 text-red-800' : 
                          subtask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {subtask.priority}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 flex justify-between">
                    <span>Assignee: {subtask.assigned_to_profile?.full_name || subtask.assigned_to_profile?.email || 'Unassigned'}</span>
                    {subtask.due_date && <span>Due: {new Date(subtask.due_date).toLocaleDateString()}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
