/**
 * Maps project weeks (W1, W2, … from course start) to evidence folder/file naming.
 *
 * The group repo pipeline often stores week N+1 data in folder "Week N+1" with
 * filenames *_2026-W{N+1}.* while the course project week is N (from May 25).
 * Legacy folder "Week 26" held project W6 data.
 */

/** @deprecated Legacy folder number before rename to Week 6 */
export const LEGACY_W6_FOLDER = 26;

/** Folders numbered 7+ use file week = folder number = project week + 1 */
const PIPELINE_WEEK_OFFSET = 1;

export function projectWeekToEvidenceTarget(projectWeek: number): {
  folder: number;
  fileWeek: number;
} {
  if (projectWeek <= 5) {
    return { folder: projectWeek, fileWeek: projectWeek };
  }
  if (projectWeek === 6) {
    return { folder: 6, fileWeek: 6 };
  }
  const folder = projectWeek + PIPELINE_WEEK_OFFSET;
  return { folder, fileWeek: folder };
}

export function folderAndFileWeekToProjectWeek(
  folder: number,
  fileWeek: number
): number {
  if (folder === LEGACY_W6_FOLDER || (folder === 6 && fileWeek === 6)) {
    return 6;
  }
  if (folder >= 7 && fileWeek === folder) {
    return folder - PIPELINE_WEEK_OFFSET;
  }
  if (fileWeek >= 1 && fileWeek <= 30) {
    return fileWeek;
  }
  return folder;
}

export function parseFileWeekFromName(filename: string): number | null {
  const match = filename.match(/2026-W(\d+)/i) ?? filename.match(/[_-]w(\d+)[._]/i);
  return match ? Number(match[1]) : null;
}

export function evidenceFolderPath(folder: number, subPath = ''): string {
  const base = `evidence/Week ${folder}`;
  return subPath ? `${base}/${subPath.replace(/^\/+/, '')}` : base;
}

export function evidencePathsForProjectWeek(
  projectWeek: number,
  filename: string
): string[] {
  const { folder } = projectWeekToEvidenceTarget(projectWeek);
  const paths = [evidenceFolderPath(folder, filename)];

  // Legacy fallback until group repo rename lands everywhere
  if (projectWeek === 6) {
    paths.push(evidenceFolderPath(LEGACY_W6_FOLDER, filename));
  }

  return paths;
}
