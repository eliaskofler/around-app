import * as SQLite from 'expo-sqlite';

import { DateKey } from '@/utils/date';
import { EntriesByDate, Entry, EntryProduct, EntrySource } from '@/utils/entries';
import { Section, SectionColor, SectionIcon } from '@/utils/sections';

/**
 * The food log's own database — separate from `kv-store.ts`'s tiny
 * preferences store. `openDatabaseSync` just opens the file handle
 * synchronously; every actual read/write below goes through the async
 * methods so it never blocks the JS thread.
 */
const db = SQLite.openDatabaseSync('around.db');

type SectionRow = {
  id: string;
  title: string;
  icon: string;
  color: string;
  hidden: number;
  position: number;
};

type EntryRow = {
  id: string;
  date: string;
  section: string;
  position: number;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  waterMl: number | null;
  loggedAt: string;
  healthSampleId: string | null;
  source: string | null;
  emoji: string | null;
  imageUrl: string | null;
  product: string | null;
};

/** First local schema this app has ever had — nothing to migrate from yet. */
export async function initDatabase(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      hidden INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      section TEXT NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      calories REAL NOT NULL,
      carbs REAL NOT NULL,
      protein REAL NOT NULL,
      fat REAL NOT NULL,
      waterMl REAL,
      loggedAt TEXT NOT NULL,
      healthSampleId TEXT,
      source TEXT,
      emoji TEXT,
      imageUrl TEXT,
      product TEXT
    );
    CREATE INDEX IF NOT EXISTS entries_date_idx ON entries(date);
  `);
}

function sectionFromRow(row: SectionRow): Section {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon as SectionIcon,
    color: row.color as SectionColor,
    hidden: row.hidden !== 0,
  };
}

/** `null` when the table is empty — the caller seeds `DEFAULT_SECTIONS` in that case. */
export async function loadSections(): Promise<Section[] | null> {
  const rows = await db.getAllAsync<SectionRow>('SELECT * FROM sections ORDER BY position');
  return rows.length === 0 ? null : rows.map(sectionFromRow);
}

export async function seedSections(sections: readonly Section[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [index, section] of sections.entries()) {
      await upsertSectionRow(section, index);
    }
  });
}

async function upsertSectionRow(section: Section, position: number): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO sections (id, title, icon, color, hidden, position) VALUES (?, ?, ?, ?, ?, ?)`,
    [section.id, section.title, section.icon, section.color, section.hidden ? 1 : 0, position],
  );
}

export async function upsertSection(section: Section, position: number): Promise<void> {
  await upsertSectionRow(section, position);
}

export async function setSectionHiddenRow(id: string, hidden: boolean): Promise<void> {
  await db.runAsync('UPDATE sections SET hidden = ? WHERE id = ?', [hidden ? 1 : 0, id]);
}

export async function deleteSectionRow(id: string): Promise<void> {
  await db.runAsync('DELETE FROM sections WHERE id = ?', [id]);
}

/** Used by `removeSection`'s "entries fall back to the first remaining section" behavior. */
export async function reassignSectionEntries(fromId: string, toId: string): Promise<void> {
  await db.runAsync('UPDATE entries SET section = ? WHERE section = ?', [toId, fromId]);
}

/** Drops anything that fails to parse rather than throwing — same defensive read as `use-nutrition-goals.tsx`. */
function parseJsonField<T>(value: string | null): T | undefined {
  if (value === null) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function entryFromRow(row: EntryRow): Entry {
  return {
    id: row.id,
    name: row.name,
    calories: row.calories,
    carbs: row.carbs,
    protein: row.protein,
    fat: row.fat,
    section: row.section,
    waterMl: row.waterMl ?? undefined,
    loggedAt: row.loggedAt,
    healthSampleId: row.healthSampleId ?? undefined,
    source: parseJsonField<EntrySource>(row.source),
    emoji: row.emoji ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    product: parseJsonField<EntryProduct>(row.product),
  };
}

export async function loadEntries(): Promise<EntriesByDate> {
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY date, section, position',
  );

  const entriesByDate: EntriesByDate = {};
  for (const row of rows) {
    const date = row.date as DateKey;
    (entriesByDate[date] ??= []).push(entryFromRow(row));
  }

  return entriesByDate;
}

export async function insertEntry(date: DateKey, entry: Entry, position: number): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO entries
      (id, date, section, position, name, calories, carbs, protein, fat, waterMl, loggedAt, healthSampleId, source, emoji, imageUrl, product)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      date,
      entry.section,
      position,
      entry.name,
      entry.calories,
      entry.carbs,
      entry.protein,
      entry.fat,
      entry.waterMl ?? null,
      entry.loggedAt,
      entry.healthSampleId ?? null,
      entry.source ? JSON.stringify(entry.source) : null,
      entry.emoji ?? null,
      entry.imageUrl ?? null,
      entry.product ? JSON.stringify(entry.product) : null,
    ],
  );
}

/** Updates everything except `section`/`position` — those move via `reindexSection`. */
export async function updateEntryFields(date: DateKey, entry: Entry): Promise<void> {
  await db.runAsync(
    `UPDATE entries SET
      date = ?, name = ?, calories = ?, carbs = ?, protein = ?, fat = ?, waterMl = ?,
      loggedAt = ?, healthSampleId = ?, source = ?, emoji = ?, imageUrl = ?, product = ?
     WHERE id = ?`,
    [
      date,
      entry.name,
      entry.calories,
      entry.carbs,
      entry.protein,
      entry.fat,
      entry.waterMl ?? null,
      entry.loggedAt,
      entry.healthSampleId ?? null,
      entry.source ? JSON.stringify(entry.source) : null,
      entry.emoji ?? null,
      entry.imageUrl ?? null,
      entry.product ? JSON.stringify(entry.product) : null,
      entry.id,
    ],
  );
}

export async function updateEntryHealthSampleId(id: string, healthSampleId: string): Promise<void> {
  await db.runAsync('UPDATE entries SET healthSampleId = ? WHERE id = ?', [healthSampleId, id]);
}

export async function deleteEntryRow(id: string): Promise<void> {
  await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
}

/** Rewrites `section`/`position` for a whole section's entries after a reorder or a move between sections. */
export async function reindexSection(
  date: DateKey,
  section: string,
  orderedIds: string[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE entries SET section = ?, position = ? WHERE id = ?', [
        section,
        index,
        id,
      ]);
    }
  });
}
