import * as Haptics from 'expo-haptics';
import { createContext, use, useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, SharedValue, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';

import { Entry } from '@/utils/entries';

/** Rows are a fixed height so a drop slot can be derived from the finger's y. */
export const ROW_HEIGHT = 52;
/** A row plus the hairline that follows it. */
export const ROW_SLOT = ROW_HEIGHT + StyleSheet.hairlineWidth;
/** How long the finger has to rest on a row before it lifts. */
const LONG_PRESS_DURATION = 220;

/** Where a card sits on screen, captured when a drag is about to start. */
type CardLayout = { y: number; count: number };

export type DropTarget = { section: string; index: number };

export type EntryDrag = {
  /** The entry under the finger, or `null` when nothing is being dragged. */
  entry: Entry | null;
  activeId: SharedValue<string | null>;
  target: SharedValue<DropTarget | null>;
  /** Screen rect of the row the drag started from. */
  origin: SharedValue<{ x: number; y: number; width: number }>;
  translation: SharedValue<{ x: number; y: number }>;
  pointerY: SharedValue<number>;
  /** Screen rect of the day page itself. */
  viewport: SharedValue<{ x: number; y: number; height: number }>;
  registerCard: (section: string, node: View | null, count: number) => void;
  registerViewport: (node: View | null) => void;
  removeEntry: (id: string) => void;

  /** Driven by `useEntryDragGesture`; components should not call these. */
  measure: (row: View | null) => void;
  resolve: () => void;
  start: (entry: Entry) => void;
  finish: (id: string, dropped: DropTarget | null, dropping: boolean) => void;
};

type ControllerOptions = {
  /** Live scroll offset of the day, so measured cards can be re-based. */
  scrollOffset: SharedValue<number>;
  /** Ids of the sections shown on the day, in order. */
  sectionIds: string[];
  onMoveEntry: (id: string, section: string, index: number) => void;
  onRemoveEntry: (id: string) => void;
  onDragChange: (dragging: boolean) => void;
};

const EntryDragContext = createContext<EntryDrag | null>(null);

export const EntryDragProvider = EntryDragContext.Provider;

export function useEntryDrag(): EntryDrag {
  const drag = use(EntryDragContext);
  if (!drag) throw new Error('useEntryDrag must be used inside an EntryDragProvider');

  return drag;
}

/**
 * Owns a day's drag: which entry is lifted, where it would land, and the
 * measurements needed to work that out on the UI thread.
 */
export function useEntryDragController({
  scrollOffset,
  sectionIds,
  onMoveEntry,
  onRemoveEntry,
  onDragChange,
}: ControllerOptions): EntryDrag {
  const [entry, setEntry] = useState<Entry | null>(null);

  const cards = useRef(new Map<string, { node: View; count: number }>()).current;
  const viewportNode = useRef<View | null>(null);

  const activeId = useSharedValue<string | null>(null);
  const target = useSharedValue<DropTarget | null>(null);
  const origin = useSharedValue({ x: 0, y: 0, width: 0 });
  const translation = useSharedValue({ x: 0, y: 0 });
  const pointerY = useSharedValue(0);
  const viewport = useSharedValue({ x: 0, y: 0, height: 0 });
  const layout = useSharedValue<Record<string, CardLayout>>({});
  /** Scroll offset the cards were measured at — they move as the day scrolls. */
  const measuredAt = useSharedValue(0);

  const registerCard = useCallback(
    (section: string, node: View | null, count: number) => {
      if (node) cards.set(section, { node, count });
      else cards.delete(section);
    },
    [cards],
  );

  const registerViewport = useCallback((node: View | null) => {
    viewportNode.current = node;
  }, []);

  /**
   * Measured on touch-down rather than on activation: the long press buys
   * enough time for these async callbacks to land before the row lifts.
   */
  const measure = useCallback(
    (row: View | null) => {
      row?.measureInWindow((x, y, width) => {
        origin.value = { x, y, width };
      });
      viewportNode.current?.measureInWindow((x, y, _width, height) => {
        viewport.value = { x, y, height };
      });

      const next: Record<string, CardLayout> = {};
      let pending = cards.size;

      cards.forEach((card, section) => {
        card.node.measureInWindow((_x, y) => {
          next[section] = { y, count: card.count };
          pending -= 1;
          if (pending > 0) return;

          layout.value = next;
          measuredAt.value = scrollOffset.value;
        });
      });
    },
    [cards, layout, measuredAt, origin, scrollOffset, viewport],
  );

  /** Turns the finger's position into the slot the row would drop into. */
  const resolve = useCallback(() => {
    'worklet';
    const cardsById = layout.value;
    const scrolled = scrollOffset.value - measuredAt.value;
    let closest: DropTarget | null = null;
    let shortest = Number.POSITIVE_INFINITY;

    for (const section of sectionIds) {
      const card = cardsById[section];
      if (!card) continue;

      const top = card.y - scrolled;
      // Every card ends with an "Add food" row, so it is a slot taller than its entries.
      const bottom = top + (card.count + 1) * ROW_SLOT;
      const distance =
        pointerY.value < top ? top - pointerY.value : Math.max(pointerY.value - bottom, 0);

      if (distance >= shortest) continue;

      shortest = distance;
      const slot = Math.round((pointerY.value - top) / ROW_SLOT);
      closest = { section, index: Math.min(Math.max(slot, 0), card.count) };
    }

    const current = target.value;
    if (
      current &&
      closest &&
      current.section === closest.section &&
      current.index === closest.index
    ) {
      return;
    }

    target.value = closest;
  }, [layout, measuredAt, pointerY, scrollOffset, sectionIds, target]);

  const start = useCallback(
    (lifted: Entry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setEntry(lifted);
      onDragChange(true);
    },
    [onDragChange],
  );

  /**
   * Applies the drop and puts the row back down in one go, so the list and the
   * lifted copy never disagree for a frame.
   */
  const finish = useCallback(
    (id: string, dropped: DropTarget | null, dropping: boolean) => {
      if (dropping && dropped) {
        onMoveEntry(id, dropped.section, dropped.index);
      }

      setEntry(null);
      onDragChange(false);
    },
    [onDragChange, onMoveEntry],
  );

  const removeEntry = useCallback(
    (id: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRemoveEntry(id);
    },
    [onRemoveEntry],
  );

  /** A tick each time the row would land somewhere new. */
  useAnimatedReaction(
    () => target.value,
    (current, previous) => {
      if (!current || !previous) return;
      if (current.section === previous.section && current.index === previous.index) return;

      runOnJS(selectionFeedback)();
    },
  );

  return useMemo(
    () => ({
      entry,
      activeId,
      target,
      origin,
      translation,
      pointerY,
      viewport,
      registerCard,
      registerViewport,
      removeEntry,
      measure,
      resolve,
      start,
      finish,
    }),
    [
      activeId,
      entry,
      finish,
      measure,
      origin,
      pointerY,
      registerCard,
      registerViewport,
      removeEntry,
      resolve,
      start,
      target,
      translation,
      viewport,
    ],
  );
}

/**
 * The long-press-then-drag gesture for a single row. Returns the ref the row
 * has to carry so the lifted copy can start from exactly where it sat.
 */
export function useEntryDragGesture(entry: Entry) {
  const drag = useEntryDrag();
  const rowRef = useRef<View>(null);
  const { activeId, target, translation, pointerY, resolve } = drag;

  const measureRow = useCallback(() => drag.measure(rowRef.current), [drag]);
  const startRow = useCallback(() => drag.start(entry), [drag, entry]);
  const finishRow = useCallback(
    (dropped: DropTarget | null, dropping: boolean) => drag.finish(entry.id, dropped, dropping),
    [drag, entry.id],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LONG_PRESS_DURATION)
        .onBegin(() => {
          runOnJS(measureRow)();
        })
        .onStart((event) => {
          activeId.value = entry.id;
          translation.value = { x: 0, y: 0 };
          target.value = null;
          pointerY.value = event.absoluteY;
          runOnJS(startRow)();
        })
        .onUpdate((event) => {
          translation.value = { x: event.translationX, y: event.translationY };
          pointerY.value = event.absoluteY;
          resolve();
        })
        .onFinalize((_event, dropping) => {
          // A press that never lifted this row has nothing to put back down.
          if (activeId.value !== entry.id) return;

          const dropped = target.value;

          activeId.value = null;
          target.value = null;
          runOnJS(finishRow)(dropped, dropping);
        }),
    [activeId, entry.id, finishRow, measureRow, pointerY, resolve, startRow, target, translation],
  );

  return { gesture, rowRef, activeId };
}

function selectionFeedback() {
  Haptics.selectionAsync();
}
