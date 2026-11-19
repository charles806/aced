"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Shield,
  User,
  Database,
  Settings,
  Trash2,
  Edit,
  Eye,
  Plus,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Reveal } from "@/components/marketing/reveal";
import { apiRequest } from "@/app/lib/api-client";

type AuditLog = {
  id: string;
  adminUserId: string;
  adminUserEmail: string;
  adminUserName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type AdminAuditLogsResponse = {
  items: AuditLog[];
  pagination: Pagination;
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="h-3.5 w-3.5 text-emerald-600" />,
  update: <Edit className="h-3.5 w-3.5 text-accent-600" />,
  delete: <Trash2 className="h-3.5 w-3.5 text-rose-600" />,
  view: <Eye className="h-3.5 w-3.5 text-zinc-600" />,
  login: <LogIn className="h-3.5 w-3.5 text-blue-600" />,
  logout: <LogOut className="h-3.5 w-3.5 text-zinc-600" />,
  default: <Settings className="h-3.5 w-3.5 text-zinc-600" />,
};

function getActionIcon(action: string) {
  const lower = action.toLowerCase();
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return ACTION_ICONS.default;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) return "—";
  return JSON.stringify(metadata, null, 2);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: "",
    targetType: "",
    adminUserId: "",
  });
  const [showMetadata, setShowMetadata] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (filters.action) params.set("action", filters.action);
    if (filters.targetType) params.set("targetType", filters.targetType);
    if (filters.adminUserId) params.set("adminUserId", filters.adminUserId);

    try {
      const result = await apiRequest<AdminAuditLogsResponse>(`/api/admin/audit-logs?${params.toString()}`);
      if (!result.ok) {
        if (result.failure.kind === "unauthorized") {
          router.replace("/signin");
          return;
        }
        if (result.failure.kind === "forbidden") {
          setError("Admin access required");
          return;
        }
        setError(result.failure.message);
        return;
      }
      setLogs(result.data.items);
      setPagination(result.data.pagination);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page }));
    }
  };

  if (loading && logs.length === 0) {
    return (
      <DashboardShell name="Admin">
        <Reveal direction="up">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Admin Audit Logs
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                View administrative actions across the platform.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal direction="up" delay={0.05}>
          <div className="mt-6 space-y-4" role="status" aria-label="Loading audit logs">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-1/4 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  </div>
                  <div className="h-6 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell name="Admin">
        <Reveal direction="up">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Admin Audit Logs
              </h1>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                View administrative actions across the platform.
              </p>
            </div>
          </div>
        </Reveal>
        <Reveal direction="up" delay={0.05}>
          <EmptyState
            icon={AlertCircle}
            title={error === "Admin access required" ? "Admin access required" : "Couldn't load audit logs"}
            description={error === "Admin access required" ? "You need admin privileges to view this page." : error}
            cta={error !== "Admin access required" ? { label: "Try again", onClick: fetchLogs } : undefined}
          />
        </Reveal>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell name="Admin">
      <Reveal direction="up">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl dark:text-zinc-50 flex items-center gap-2">
              <Shield className="h-6 w-6 text-accent-500" aria-hidden="true" />
              Admin Audit Logs
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              View administrative actions across the platform.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal direction="up" delay={0.05}>
        {/* Filters */}
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filter-action" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Action
              </label>
              <input
                id="filter-action"
                type="text"
                placeholder="Filter by action (create, update, delete...)"
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filter-target-type" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Target Type
              </label>
              <input
                id="filter-target-type"
                type="text"
                placeholder="Filter by target type (User, Note, Quiz...)"
                value={filters.targetType}
                onChange={(e) => handleFilterChange("targetType", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filter-admin-user" className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Admin User ID
              </label>
              <input
                id="filter-admin-user"
                type="text"
                placeholder="Filter by admin user ID"
                value={filters.adminUserId}
                onChange={(e) => handleFilterChange("adminUserId", e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent-400 focus:ring-4 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20"
              />
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
          {logs.length === 0 ? (
            <div className="m-8">
              <EmptyState
                icon={Database}
                title="No audit logs found"
                description="No administrative actions match your filters."
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Admin
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Metadata
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {logs.flatMap((log) => [
                      <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                            <div>
                              <div className="font-medium">{log.adminUserName ?? log.adminUserEmail}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                {log.adminUserId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                            <div>
                              <div className="font-medium capitalize">{log.targetType}</div>
                              {log.targetId && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                  {log.targetId}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            type="button"
                            onClick={() => setShowMetadata(showMetadata === log.id ? null : log.id)}
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            <Search className="h-4 w-4" aria-hidden="true" />
                            {showMetadata === log.id ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>,
                      showMetadata === log.id ? (
                        <tr key={`${log.id}-meta`} className="bg-zinc-50 dark:bg-zinc-800/50">
                          <td colSpan={5} className="px-4 py-3">
                            <pre className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-3 overflow-x-auto font-mono">
                              {formatMetadata(log.metadata)}
                            </pre>
                          </td>
                        </tr>
                      ) : null,
                    ])}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Reveal>
    </DashboardShell>
  );
}