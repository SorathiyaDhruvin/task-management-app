'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  CheckSquare,
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  RotateCcw,
  Trash2,
  User as UserIcon,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X
} from 'lucide-react';

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  // Tasks state
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and controls
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned_to_me' | 'created_by_me'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'newest' | 'oldest' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');

  // Action status tracker
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Attempt fetching top-level tasks first
      let res = await api.tasks.list({ parent_id: 'none' });
      if (!res.success && (res.error?.code === 'INVALID_TOKEN' || res.error?.code === 'TOKEN_EXPIRED')) {
        await signOut();
        router.push('/login');
        return;
      }

      // If parent_id filtering fails (e.g. database without parent_id column yet), fallback gracefully
      if (!res.success) {
        res = await api.tasks.list();
      }

      if (res.success && res.data) {
        setAllTasks(res.data);
      } else {
        setError(res.error?.message || 'Failed to load tasks');
      }
    } catch {
      setError('An unexpected error occurred while loading tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setUpdatingTaskId(taskId);

    const previousTasks = [...allTasks];
    setAllTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            }
          : t
      )
    );

    try {
      let res;
      if (newStatus === 'completed') {
        res = await api.tasks.complete(taskId);
      } else {
        res = await api.tasks.update(taskId, { status: newStatus });
      }

      if (!res.success) {
        setAllTasks(previousTasks);
        setError(res.error?.message || 'Failed to update task status');
      }
    } catch {
      setAllTasks(previousTasks);
      setError('Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (!confirm('Are you sure you want to delete this task?')) return;
    setUpdatingTaskId(taskId);

    const previousTasks = [...allTasks];
    setAllTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const res = await api.tasks.delete(taskId);
      if (!res.success) {
        setAllTasks(previousTasks);
        setError(res.error?.message || 'Failed to delete task');
      }
    } catch {
      setAllTasks(previousTasks);
      setError('Failed to delete task');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const isOverdue = (task: Task) => {
    if (task.status === 'completed' || !task.due_date) return false;
    const dueDate = new Date(task.due_date);
    return !isNaN(dueDate.getTime()) && dueDate < new Date();
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // True aggregate stats calculated across all tasks
  const stats = useMemo(() => {
    const total = allTasks.length;
    const pending = allTasks.filter(t => t.status === 'pending').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const overdue = allTasks.filter(isOverdue).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, pending, inProgress, completed, overdue, completionRate };
  }, [allTasks]);

  // Filtered and sorted tasks
  const filteredTasks = useMemo(() => {
    return allTasks
      .filter(task => {
        // Status filter
        if (statusFilter !== 'all' && task.status !== statusFilter) return false;

        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

        // Assignment filter
        if (assignmentFilter === 'assigned_to_me' && task.assigned_to !== user?.id) return false;
        if (assignmentFilter === 'created_by_me' && task.created_by !== user?.id) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchDesc = task.description?.toLowerCase().includes(q) || false;
          const matchAssignee =
            task.assigned_to_profile?.full_name?.toLowerCase().includes(q) ||
            task.assigned_to_profile?.email?.toLowerCase().includes(q) ||
            false;
          if (!matchTitle && !matchDesc && !matchAssignee) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'priority') {
          const weights: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (weights[b.priority] || 0) - (weights[a.priority] || 0);
        }
        if (sortBy === 'due_date') {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [allTasks, statusFilter, priorityFilter, assignmentFilter, searchQuery, sortBy, user]);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {priority}
          </span>
        );
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />;
    }
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssignmentFilter('all');
    setSearchQuery('');
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm text-slate-500 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    statusFilter !== 'all' || priorityFilter !== 'all' || assignmentFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="min-h-screen bg-slate-50/80">
      <Navbar />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header section with Create Button and Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Task Dashboard</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Live
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Organize, track progress, and collaborate seamlessly across all assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadTasks}
              disabled={loading}
              title="Refresh tasks"
              className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <Link
              href="/tasks/new"
              className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusCircle className="-ml-0.5 mr-2 h-4 w-4" />
              Create Task
            </Link>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Total Tasks</span>
              <CheckSquare className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-xs font-medium text-slate-500">Overall</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Pending</span>
              <AlertCircle className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-700">{stats.pending}</span>
              <span className="text-xs font-medium text-slate-500">To do</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>In Progress</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-600">{stats.inProgress}</span>
              <span className="text-xs font-medium text-amber-600/80">Active</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-600">{stats.completed}</span>
              <span className="text-xs font-medium text-emerald-600/80">{stats.completionRate}% Done</span>
            </div>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
              <span>Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {stats.overdue}
              </span>
              <span className={`text-xs font-medium ${stats.overdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {stats.overdue > 0 ? 'Needs attention' : 'On track'}
              </span>
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        {stats.total > 0 && (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Project Completion Velocity</span>
              </div>
              <span className="text-xs font-semibold text-indigo-600">
                {stats.completed} of {stats.total} tasks completed ({stats.completionRate}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${stats.completionRate}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 mb-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <p className="text-sm font-medium text-rose-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search, Filter Bar and View Toggles */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks by title, description, or assignee..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Mode & Sorter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="due_date">Due Date (Soonest)</option>
                  <option value="priority">Priority (High to Low)</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>

              {/* View Switcher: List vs Board */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List View"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'board'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Board View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Pills row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'pending', label: 'To Do', count: stats.pending },
                { id: 'in_progress', label: 'In Progress', count: stats.inProgress },
                { id: 'completed', label: 'Completed', count: stats.completed },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Priority & Assignment dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={assignmentFilter}
                onChange={e => setAssignmentFilter(e.target.value as any)}
                className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Assignments</option>
                <option value="assigned_to_me">Assigned to Me</option>
                <option value="created_by_me">Created by Me</option>
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-2.5 pr-7 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded-md hover:bg-rose-50 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm font-medium text-slate-600">Loading your dashboard tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-xs flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {hasActiveFilters ? 'No tasks match your filters' : 'No tasks created yet'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-5">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or reset filters to see all available tasks.'
                : 'Get started by creating your first task, setting due dates, and assigning team members.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
              >
                Clear all filters
              </button>
            ) : (
              <Link
                href="/tasks/new"
                className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusCircle className="-ml-0.5 mr-2 h-4 w-4" />
                Create your first task
              </Link>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                const late = isOverdue(task);
                const isCreator = user?.id === task.created_by;
                const isAssignee = user?.id === task.assigned_to;
                const canModify = isCreator || isAssignee;
                const formattedDate = formatDueDate(task.due_date);

                return (
                  <li
                    key={task.id}
                    className="group hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Status icon, Title, Badges, Details */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          onClick={e =>
                            handleUpdateStatus(
                              task.id,
                              task.status === 'completed' ? 'pending' : 'completed',
                              e
                            )
                          }
                          disabled={updatingTaskId === task.id || !canModify}
                          title={
                            task.status === 'completed'
                              ? 'Mark as pending'
                              : 'Mark as completed'
                          }
                          className="mt-0.5 hover:scale-110 transition-transform focus:outline-none"
                        >
                          {getStatusIcon(task.status)}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="text-sm sm:text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                            >
                              {task.title}
                            </Link>
                            {getPriorityBadge(task.priority)}
                            {late && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Assignee:{' '}
                                <strong className="font-medium text-slate-700">
                                  {task.assigned_to_profile?.full_name ||
                                    task.assigned_to_profile?.email ||
                                    'Unassigned'}
                                </strong>
                              </span>
                            </div>

                            {formattedDate && (
                              <div
                                className={`flex items-center gap-1.5 ${
                                  late ? 'text-rose-600 font-semibold' : ''
                                }`}
                              >
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Due: {formattedDate}</span>
                              </div>
                            )}

                            <div className="hidden md:flex items-center gap-1.5 text-slate-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Created {new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick In-Place Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {canModify && task.status === 'pending' && (
                          <button
                            onClick={e => handleUpdateStatus(task.id, 'in_progress', e)}
                            disabled={updatingTaskId === task.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            Start
                          </button>
                        )}

                        {canModify && task.status === 'in_progress' && (
                          <button
                            onClick={e => handleUpdateStatus(task.id, 'completed', e)}
                            disabled={updatingTaskId === task.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Complete
                          </button>
                        )}

                        {canModify && task.status === 'completed' && (
                          <button
                            onClick={e => handleUpdateStatus(task.id, 'pending', e)}
                            disabled={updatingTaskId === task.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reopen
                          </button>
                        )}

                        {isCreator && (
                          <button
                            onClick={e => handleDeleteTask(task.id, e)}
                            disabled={updatingTaskId === task.id}
                            title="Delete task"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <Link
                          href={`/tasks/${task.id}`}
                          className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                        >
                          Details &rarr;
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              [
                { id: 'pending', title: 'To Do', icon: AlertCircle, color: 'text-slate-500', border: 'border-slate-200' },
                { id: 'in_progress', title: 'In Progress', icon: Clock, color: 'text-amber-500', border: 'border-amber-200' },
                { id: 'completed', title: 'Done', icon: CheckCircle2, color: 'text-emerald-500', border: 'border-emerald-200' },
              ] as const
            ).map(column => {
              const columnTasks = filteredTasks.filter(t => t.status === column.id);

              return (
                <div
                  key={column.id}
                  className="bg-slate-100/70 rounded-xl p-4 border border-slate-200 flex flex-col min-h-[500px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <column.icon className={`w-4 h-4 ${column.color}`} />
                      <h3 className="text-sm font-bold text-slate-800">{column.title}</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Cards inside column */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {columnTasks.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        No tasks in this stage
                      </div>
                    ) : (
                      columnTasks.map(task => {
                        const late = isOverdue(task);
                        const isCreator = user?.id === task.created_by;
                        const isAssignee = user?.id === task.assigned_to;
                        const canModify = isCreator || isAssignee;
                        const formattedDate = formatDueDate(task.due_date);

                        return (
                          <div
                            key={task.id}
                            className="bg-white rounded-lg p-4 border border-slate-200/90 shadow-xs hover:shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <Link
                                  href={`/tasks/${task.id}`}
                                  className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-2"
                                >
                                  {task.title}
                                </Link>
                                {getPriorityBadge(task.priority)}
                              </div>

                              {task.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 mt-2 space-y-2">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className="truncate">
                                  {task.assigned_to_profile?.full_name ||
                                    task.assigned_to_profile?.email ||
                                    'Unassigned'}
                                </span>
                                {formattedDate && (
                                  <span
                                    className={`inline-flex items-center gap-1 ${
                                      late ? 'text-rose-600 font-bold' : ''
                                    }`}
                                  >
                                    <Calendar className="w-3 h-3" />
                                    {formattedDate}
                                  </span>
                                )}
                              </div>

                              {/* Action buttons inside card */}
                              {canModify && (
                                <div className="flex items-center justify-between pt-1 gap-1">
                                  {task.status !== 'completed' ? (
                                    <button
                                      onClick={e => handleUpdateStatus(task.id, 'completed', e)}
                                      disabled={updatingTaskId === task.id}
                                      className="text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 transition-colors"
                                    >
                                      ✓ Complete
                                    </button>
                                  ) : (
                                    <button
                                      onClick={e => handleUpdateStatus(task.id, 'pending', e)}
                                      disabled={updatingTaskId === task.id}
                                      className="text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                    >
                                      ↺ To Do
                                    </button>
                                  )}

                                  {task.status === 'pending' && (
                                    <button
                                      onClick={e => handleUpdateStatus(task.id, 'in_progress', e)}
                                      disabled={updatingTaskId === task.id}
                                      className="text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 transition-colors"
                                    >
                                      ▶ Start
                                    </button>
                                  )}

                                  {isCreator && (
                                    <button
                                      onClick={e => handleDeleteTask(task.id, e)}
                                      disabled={updatingTaskId === task.id}
                                      className="text-[11px] text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
