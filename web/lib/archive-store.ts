const STORAGE_KEY = "openats_archive_v1";

export type ArchiveType = "job" | "candidate" | "offer";

export type ArchiveEntry = {
  id: string;
  type: ArchiveType;
  name: string;
  detail: string;
  archivedAt: string;
};

function read(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ArchiveEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: ArchiveEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getArchived(): ArchiveEntry[] {
  return read();
}

export function archiveItem(entry: Omit<ArchiveEntry, "archivedAt">): void {
  const items = read();
  const next: ArchiveEntry = {
    ...entry,
    archivedAt: new Date().toISOString(),
  };
  write([next, ...items.filter((x) => !(x.id === entry.id && x.type === entry.type))]);
}

export function permanentlyDelete(id: string, type: ArchiveType): void {
  const items = read().filter((x) => !(x.id === id && x.type === type));
  write(items);
}
