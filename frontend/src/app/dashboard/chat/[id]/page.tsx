"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import {
  ArrowLeft,
  Send,
  Loader2,
  Code2,
  User,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileCode,
  FolderOpen,
  Zap,
  AlertCircle,
  X,
  Clock,
} from "lucide-react";
import { projectsApi, chatApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  tokens_used: number;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  total_files: number;
  is_single_file: boolean;
  file_name: string | null;
}

interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [tokensRemaining, setTokensRemaining] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [error, setError] = useState<{
    type: "rate_limit" | "token_limit" | "general";
    message: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, historyRes, filesRes, usageRes] = await Promise.all([
        projectsApi.get(projectId),
        chatApi.getHistory(projectId),
        projectsApi.getFiles(projectId),
        chatApi.getUsage(),
      ]);

      setProject(projectRes.data);
      setMessages(
        historyRes.data.messages.map((msg: any, index: number) => ({
          ...msg,
          id: msg.id || `msg-${index}-${Date.now()}`,
        })),
      );
      setFileTree(filesRes.data.files || []); // Handle undefined/null
      setTokensRemaining(usageRes.data.tokens_remaining);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput("");
    setIsSending(true);
    setError(null); // Clear previous errors

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await chatApi.send(projectId, userMessage);

      // Check if response has the expected structure
      const assistantMessage = response.data.message || response.data;
      const tokensRemaining = response.data.tokens_remaining || 0;

      // Replace temp message and add AI response
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...tempUserMsg, id: `user-${Date.now()}` },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant" as const,
          content:
            typeof assistantMessage === "string"
              ? assistantMessage
              : assistantMessage.content || "No response",
          tokens_used: response.data.tokens_used || 0,
          created_at: new Date().toISOString(),
        },
      ]);
      setTokensRemaining(tokensRemaining);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      // Remove temp message on error
      setMessages((prev) => prev.slice(0, -1));

      const status = error.response?.status;
      const detail = error.response?.data?.detail || "Failed to send message";

      if (status === 429) {
        setError({
          type: "rate_limit",
          message: detail,
        });
      } else if (status === 403) {
        setError({
          type: "token_limit",
          message: detail,
        });
      } else {
        setError({
          type: "general",
          message: detail,
        });
      }

      // Auto-dismiss general errors after 5 seconds
      if (status !== 429 && status !== 403) {
        setTimeout(() => setError(null), 5000);
      }
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear all chat history for this project?")) return;

    try {
      await chatApi.clearHistory(projectId);
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 lg:left-64 flex bg-[var(--bg-primary)]">
      {/* Sidebar - File Tree */}
      <div
        className={`${
          showSidebar ? "w-64" : "w-0"
        } shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border)] overflow-hidden transition-all `}
      >
        <div className="w-64 h-full flex flex-col ">
          {/* Project Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
            <h2 className="font-semibold text-[var(--text-primary)] truncate">
              {project?.name}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              {project?.is_single_file
                ? project.file_name
                : `${project?.total_files} files`}
            </p>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            <FileTreeView nodes={fileTree} />
          </div>

          {/* Token Counter */}
          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm text-[var(--text-secondary)]">
                {formatNumber(tokensRemaining)} tokens left
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Error Banner */}
        {error && (
          <div
            className={`px-4 py-3 border-b flex items-start gap-3 animate-fade-in ${
              error.type === "rate_limit"
                ? "bg-[var(--warning)]/10 border-[var(--warning)]/20"
                : error.type === "token_limit"
                  ? "bg-[var(--error)]/10 border-[var(--error)]/20"
                  : "bg-[var(--error)]/10 border-[var(--error)]/20"
            }`}
          >
            {error.type === "rate_limit" ? (
              <Clock className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
            ) : (
              <AlertCircle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  error.type === "token_limit"
                    ? "text-[var(--error)]"
                    : "text-[var(--error)]"
                }`}
              />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  error.type === "rate_limit"
                    ? "text-[var(--warning)]"
                    : "text-[var(--error)]"
                }`}
              >
                {error.type === "rate_limit"
                  ? "Rate Limit Reached"
                  : error.type === "token_limit"
                    ? "Token Limit Reached"
                    : "Error"}
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {error.message}
              </p>
              {error.type === "token_limit" && (
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Upgrade Plan
                </Link>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>
        )}

        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors lg:hidden"
            >
              <ChevronRight
                className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${
                  showSidebar ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className="hidden lg:block">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <ChevronRight
                  className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${
                    showSidebar ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
            <h1 className="font-semibold text-[var(--text-primary)]">
              Chat with {project?.name}
            </h1>
          </div>
          <button
            onClick={handleClearHistory}
            className="p-2 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
            title="Clear chat history"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
                  <Code2 className="w-8 h-8 text-[var(--accent)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Start chatting with your code
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Ask questions about your codebase. I can explain functions,
                  trace logic, and help you understand how things work.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex gap-4">
                <div
                  className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--bg-elevated)]"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Code2 className="w-4 h-4 text-[var(--accent)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] mb-1">
                    {message.role === "user" ? "You" : "Codexa AI"}
                  </p>
                  <div className="text-[var(--text-primary)]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        code: ({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) => {
                          return !inline ? (
                            <pre className="bg-[var(--bg-elevated)] rounded-lg p-3 overflow-x-auto my-2 border border-[var(--border)]">
                              <code
                                className={`${className} text-sm font-mono`}
                                {...props}
                              >
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code
                              className="bg-[var(--bg-elevated)] text-[var(--accent)] px-1.5 py-0.5 rounded text-sm font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => <>{children}</>,
                        p: ({ children }) => (
                          <p className="mb-2 leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc ml-4 mb-2 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal ml-4 mb-2 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => <li>{children}</li>,
                        h1: ({ children }) => (
                          <h1 className="text-xl font-bold mb-2 mt-3">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-lg font-bold mb-2 mt-2">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-semibold mb-1 mt-2">
                            {children}
                          </h3>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent)] hover:underline"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-[var(--accent)] pl-3 italic text-[var(--text-secondary)] my-2">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-[var(--bg-elevated)]">
                <Code2 className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span className="text-[var(--text-muted)]">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="relative max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your code..."
              rows={1}
              className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-none leading-6"
              style={{ minHeight: "44px", maxHeight: "150px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function FileTreeView({ nodes }: { nodes: FileNode[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-[var(--text-muted)]">
        No files to display
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <FileTreeNode key={node.path} node={node} />
      ))}
    </div>
  );
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors ${
          node.is_dir ? "cursor-pointer" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => node.is_dir && setIsOpen(!isOpen)}
      >
        {node.is_dir ? (
          <>
            <ChevronDown
              className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${
                isOpen ? "" : "-rotate-90"
              }`}
            />
            <FolderOpen className="w-4 h-4 text-[var(--accent)]" />
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileCode className="w-4 h-4 text-[var(--text-muted)]" />
          </>
        )}
        <span className="text-sm text-[var(--text-secondary)] truncate">
          {node.name}
        </span>
      </div>
      {node.is_dir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
