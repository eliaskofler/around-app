import { DateKey } from '@/utils/date';
import { EntriesByDate, Entry } from '@/utils/entries';
import { Section } from '@/utils/sections';

/**
 * Web counterpart to `db.ts` — there's no real local database available (same
 * constraint `kv-store.web.ts` documents for prefs), so this keeps two JSON
 * blobs in `localStorage` behind the exact same async function signatures,
 * so `use-food-log.tsx` never has to branch on platform.
 */
const SECTIONS_KEY = 'around-sections';
const ENTRIES_KEY = 'around-entries';

type StoredEntry = Entry & { date: DateKey };

function readSections(): Section[] {
  try {
    const raw = window.localStorage.getItem(SECTIONS_KEY);
    return raw ? (JSON.parse(raw) as Section[]) : [];
  } catch {
    return [];
  }
}

function writeSections(sections: Section[]): void {
  try {
    window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
  } catch {
    // Ignore — e.g. private browsing with storage disabled.
  }
}

function readEntries(): StoredEntry[] {
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as StoredEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: StoredEntry[]): void {
  try {
    window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // Ignore — e.g. private browsing with storage disabled.
  }
}

export async function initDatabase(): Promise<void> {
  // Nothing to create — `localStorage` needs no schema.
}

export async function loadSections(): Promise<Section[] | null> {
  const sections = readSections();
  return sections.length === 0 ? null : sections;
}

export async function seedSections(sections: readonly Section[]): Promise<void> {
  writeSections([...sections]);
}

export async function upsertSection(section: Section, position: number): Promise<void> {
  const sections = readSections();
  const index = sections.findIndex((candidate) => candidate.id === section.id);
  if (index === -1) {
    sections.splice(position, 0, section);
  } else {
    sections[index] = section;
  }
  writeSections(sections);
}

export async function setSectionHiddenRow(id: string, hidden: boolean): Promise<void> {
  writeSections(
    readSections().map((section) => (section.id === id ? { ...section, hidden } : section)),
  );
}

export async function deleteSectionRow(id: string): Promise<void> {
  writeSections(readSections().filter((section) => section.id !== id));
}

export async function reassignSectionEntries(fromId: string, toId: string): Promise<void> {
  writeEntries(
    readEntries().map((entry) => (entry.section === fromId ? { ...entry, section: toId } : entry)),
  );
}

export async function loadEntries(): Promise<EntriesByDate> {
  const entriesByDate: EntriesByDate = {};
  for (const { date, ...entry } of readEntries()) {
    (entriesByDate[date] ??= []).push(entry);
  }
  return entriesByDate;
}

export async function insertEntry(date: DateKey, entry: Entry, position: number): Promise<void> {
  const entries = readEntries().filter((candidate) => candidate.id !== entry.id);
  const sectionEntries = entries.filter(
    (candidate) => candidate.date === date && candidate.section === entry.section,
  );
  const others = entries.filter(
    (candidate) => !(candidate.date === date && candidate.section === entry.section),
  );
  sectionEntries.splice(position, 0, { ...entry, date });
  writeEntries([...others, ...sectionEntries]);
}

export async function updateEntryFields(date: DateKey, entry: Entry): Promise<void> {
  writeEntries(
    readEntries().map((candidate) =>
      candidate.id === entry.id ? { ...entry, date } : candidate,
    ),
  );
}

export async function updateEntryHealthSampleId(id: string, healthSampleId: string): Promise<void> {
  writeEntries(
    readEntries().map((candidate) => (candidate.id === id ? { ...candidate, healthSampleId } : candidate)),
  );
}

export async function deleteEntryRow(id: string): Promise<void> {
  writeEntries(readEntries().filter((candidate) => candidate.id !== id));
}

export async function reindexSection(
  date: DateKey,
  section: string,
  orderedIds: string[],
): Promise<void> {
  const entries = readEntries();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const others = entries.filter(
    (entry) => !(entry.date === date && orderedIds.includes(entry.id)),
  );
  const reordered = orderedIds
    .map((id) => byId.get(id))
    .filter((entry): entry is StoredEntry => entry !== undefined)
    .map((entry) => ({ ...entry, section, date }));

  writeEntries([...others, ...reordered]);
}
