"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  FileCode,
  Trash2,
  MessageSquare,
  Loader2,
  FolderOpen,
  File,
  AlertCircle,
  Zap,
} from "lucide-react";
import { projectsApi, chatApi } from "@/lib/api";
import { formatNumber, formatDate } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  total_files: number;
  total_size: number;
  is_embedded: boolean;
  embedding_status: string;
  is_single_file: boolean;
  file_name: string | null;
  created_at: string;
}

interface Usage {
  tokens_used: number;
  tokens_limit: number;
  tokens_remaining: number;
  tier: string;
  projects_used: number;
  projects_limit: number;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, usageRes] = await Promise.all([
        projectsApi.list(),
        chatApi.getUsage(),
      ]);
      setProjects(projectsRes.data.projects);
      setUsage(usageRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await projectsApi.delete(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const tokenPercentage = usage
    ? (usage.tokens_used / usage.tokens_limit) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Your Projects
          </h1>
          <p className="text-[var(--text-secondary)]">
            Upload and chat with your codebases
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFileModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <File className="w-4 h-4" />
            Add File
          </button>
          {usage && usage.tier !== "free" && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload Project
            </button>
          )}
        </div>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Monthly Tokens
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {formatNumber(usage.tokens_used)} /{" "}
                  {formatNumber(usage.tokens_limit)}
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    tokenPercentage > 90
                      ? "bg-[var(--error)]"
                      : tokenPercentage > 70
                      ? "bg-[var(--warning)]"
                      : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${Math.min(tokenPercentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {formatNumber(usage.tokens_remaining)} tokens remaining
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-secondary)]">Plan</p>
              <p className="text-lg font-semibold text-[var(--text-primary)] capitalize">
                {usage.tier === "pro_plus" ? "Pro+" : usage.tier}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Free tier upgrade notice */}
      {usage?.tier === "free" && (
        <div className="glass rounded-2xl p-6 mb-8 border border-[var(--warning)]/30">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-[var(--warning)] shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                You&apos;re on the Free plan
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Upgrade to upload full projects (zip files) and get more tokens.
              </p>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            No projects yet
          </h3>
          <p className="text-[var(--text-secondary)] mb-6">
            {usage?.tier === "free"
              ? "Add a file to start chatting with your code"
              : "Upload a project or add a file to get started"}
          </p>
          <button
            onClick={() => setShowFileModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add Your First File
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass rounded-2xl p-6 hover:border-[var(--border-hover)] transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
                  {project.is_single_file ? (
                    <FileCode className="w-6 h-6 text-[var(--accent)]" />
                  ) : (
                    <FolderOpen className="w-6 h-6 text-[var(--accent)]" />
                  )}
                </div>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold text-[var(--text-primary)] mb-1 truncate">
                {project.name}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                {project.is_single_file
                  ? project.file_name
                  : `${project.total_files} files`}
              </p>

              {/* Status */}
              <div className="flex items-center gap-2 mb-4">
                {project.embedding_status === "completed" ? (
                  <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span>
                    Ready
                  </span>
                ) : project.embedding_status === "processing" ? (
                  <span className="flex items-center gap-1 text-xs text-[var(--warning)]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]"></span>
                    {project.embedding_status}
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)]">
                  • {formatDate(project.created_at)}
                </span>
              </div>

              <Link
                href={`/dashboard/chat/${project.id}`}
                className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl transition-colors cursor-pointer ${
                  project.is_embedded
                    ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Upload Project Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchData();
          }}
        />
      )}

      {/* Add File Modal */}
      {showFileModal && (
        <FileModal
          onClose={() => setShowFileModal(false)}
          onSuccess={() => {
            setShowFileModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function UploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setIsUploading(true);
    setError("");

    try {
      await projectsApi.uploadZip(name, file);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload project");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          Upload Project
        </h2>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 mb-4">
            <AlertCircle className="w-4 h-4 text-[var(--error)]" />
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              ZIP File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:text-white file:cursor-pointer"
              />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Max 200MB. node_modules and other large folders are automatically
              excluded.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl glass glass-hover text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file || !name}
              className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FileModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fileName || !content) return;

    setIsUploading(true);
    setError("");

    try {
      await projectsApi.uploadFile({ name, file_name: fileName, content });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to add file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
          Add Single File
        </h2>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 mb-4">
            <AlertCircle className="w-4 h-4 text-[var(--error)]" />
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Script"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                File Name
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="script.py"
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Code Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your code here..."
              required
              rows={15}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono text-sm resize-none"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Max 500 lines for free tier.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl glass glass-hover text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !name || !fileName || !content}
              className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add File"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
