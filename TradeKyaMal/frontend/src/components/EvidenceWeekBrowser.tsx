'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  File,
  FileJson,
  FileText,
  Folder,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';
import { MarkdownContent } from '@/components/MarkdownContent';
import {
  EVIDENCE_REPO,
  cleanReportMarkdown,
  fetchEvidenceFileContent,
  fetchPipelineStatus,
  fileKind,
  formatRelativeTime,
  getWeekPipelineCommit,
  listWeekEvidenceFiles,
  matchesAgentFilter,
  rawFileUrl,
} from '@/lib/evidenceClient';
import type { AgentType, EvidenceCommitInfo, EvidenceFileEntry } from '@/lib/types';

interface EvidenceWeekBrowserProps {
  agentFilter?: AgentType | AgentType[];
  initialWeek?: number;
}

function FileIcon({ name }: { name: string }) {
  const kind = fileKind(name);
  if (kind === 'json') return <FileJson className="h-4 w-4 shrink-0 text-text-muted" />;
  if (kind === 'image') return <ImageIcon className="h-4 w-4 shrink-0 text-text-muted" />;
  if (kind === 'markdown') return <FileText className="h-4 w-4 shrink-0 text-text-muted" />;
  return <File className="h-4 w-4 shrink-0 text-text-muted" />;
}

export function EvidenceWeekBrowser({ agentFilter, initialWeek }: EvidenceWeekBrowserProps) {
  const [week, setWeek] = useState(initialWeek ?? 8);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [subPath, setSubPath] = useState('');
  const [files, setFiles] = useState<EvidenceFileEntry[]>([]);
  const [commit, setCommit] = useState<EvidenceCommitInfo | null>(null);
  const [selected, setSelected] = useState<EvidenceFileEntry | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');

  const breadcrumbParts = useMemo(() => {
    const parts = [`evidence`, `Week ${week}`];
    if (subPath) parts.push(...subPath.split('/'));
    return parts;
  }, [week, subPath]);

  const visibleFiles = useMemo(
    () => files.filter((file) => file.type === 'dir' || matchesAgentFilter(file.name, agentFilter)),
    [files, agentFilter]
  );

  const loadWeekData = useCallback(async (targetWeek: number, folderSubPath: string) => {
    setLoading(true);
    setError('');
    try {
      const [entries, commitInfo] = await Promise.all([
        listWeekEvidenceFiles(targetWeek, folderSubPath),
        getWeekPipelineCommit(targetWeek),
      ]);

      setFiles(entries);
      setCommit(commitInfo);
      setSelected(null);
      setPreview('');
    } catch {
      setError('Could not load files.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelineStatus().then((status) => {
      setAvailableWeeks(status.availableWeeks ?? []);
      if (!initialWeek) setWeek(status.defaultWeek);
    });
  }, [initialWeek]);

  useEffect(() => {
    loadWeekData(week, subPath);
  }, [week, subPath, loadWeekData]);

  const openFile = async (file: EvidenceFileEntry) => {
    if (file.type === 'dir') {
      setSubPath(subPath ? `${subPath}/${file.name}` : file.name);
      return;
    }

    setSelected(file);
    setPreviewLoading(true);

    const kind = fileKind(file.name);
    if (kind === 'image') {
      setPreview(rawFileUrl(file.path));
      setPreviewLoading(false);
      return;
    }

    const content = await fetchEvidenceFileContent(file.path);
    setPreview(content ? cleanReportMarkdown(content) : 'File not available.');
    setPreviewLoading(false);
  };

  const navigateBreadcrumb = (index: number) => {
    if (index <= 1) {
      setSubPath('');
      return;
    }
    const parts = subPath.split('/');
    setSubPath(parts.slice(0, index - 1).join('/'));
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-raised p-12 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading files...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2 text-text-muted">
            Week
            <select
              value={week}
              onChange={(e) => {
                setWeek(Number(e.target.value));
                setSubPath('');
              }}
              className="rounded border border-border bg-surface px-2 py-1 font-mono text-sm text-text-primary"
            >
              {(availableWeeks.length ? availableWeeks : [week]).map((w) => (
                <option key={w} value={w}>
                  W{w}
                </option>
              ))}
            </select>
          </label>
          <span className="text-xs text-text-muted">{EVIDENCE_REPO}</span>
        </div>

        <button
          type="button"
          onClick={() => loadWeekData(week, subPath)}
          className="flex items-center gap-1.5 rounded border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-overlay"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
        <div className="flex flex-wrap items-center gap-1 border-b border-border-subtle px-4 py-3 text-sm">
          {breadcrumbParts.map((part, index) => (
            <span key={`${part}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-muted" />}
              <button
                type="button"
                onClick={() => navigateBreadcrumb(index)}
                className={clsx(
                  'font-mono text-xs hover:text-accent',
                  index === breadcrumbParts.length - 1
                    ? 'text-text-primary'
                    : 'text-accent'
                )}
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        <div className="hidden border-b border-border-subtle px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px]">
          <span>Name</span>
          <span>Last commit message</span>
          <span className="text-right">Updated</span>
        </div>

        {visibleFiles.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-muted">
            No files for week {week}.
          </div>
        ) : (
          visibleFiles.map((file) => (
            <button
              key={file.path}
              type="button"
              onClick={() => openFile(file)}
              className={clsx(
                'grid w-full grid-cols-1 gap-1 border-b border-border-subtle/70 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-overlay md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px] md:items-center md:gap-4',
                selected?.path === file.path && 'bg-surface-overlay'
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {file.type === 'dir' ? (
                  <Folder className="h-4 w-4 shrink-0 text-accent" />
                ) : (
                  <FileIcon name={file.name} />
                )}
                <span className="truncate font-mono text-sm text-accent">{file.name}</span>
              </span>
              <span className="truncate text-xs text-text-secondary md:text-sm">
                {commit?.message ?? `Auto-commit: Pipeline execution (Week ${week})`}
              </span>
              <span className="text-xs text-text-muted md:text-right">
                {commit ? formatRelativeTime(commit.date) : '—'}
              </span>
            </button>
          ))
        )}
      </div>

      {selected && (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-raised">
          <div className="border-b border-border-subtle px-4 py-3">
            <p className="font-mono text-sm text-text-primary">{selected.name}</p>
            <p className="mt-1 text-xs text-text-muted">{selected.path}</p>
          </div>

          <div className="p-4">
            {previewLoading ? (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preview...
              </div>
            ) : fileKind(selected.name) === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={selected.name}
                className="max-w-full rounded border border-border-subtle"
              />
            ) : fileKind(selected.name) === 'json' ? (
              <pre className="overflow-x-auto rounded border border-border-subtle bg-surface p-4 text-xs text-text-secondary">
                {preview}
              </pre>
            ) : (
              <MarkdownContent content={preview} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
