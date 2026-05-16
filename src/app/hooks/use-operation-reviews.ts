"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { HotEvent, Strategy } from "@/lib/hot-events";
import {
  createReviewRecord,
  createReviewRecommendations,
  summarizeReviewRecords,
  upsertReviewRecord,
  type ReviewDecision,
  type ReviewRecord,
  type ReviewRejectReason,
} from "@/lib/operation-review";

const STORAGE_KEY = "hotagent-operation-reviews";
const CHANGE_EVENT = "hotagent-operation-reviews-change";
const EMPTY_REVIEWS: ReviewRecord[] = [];
let cachedRaw: string | null = null;
let cachedRecords: ReviewRecord[] = EMPTY_REVIEWS;

export function useOperationReviews() {
  const records = useSyncExternalStore(
    subscribeReviews,
    readStoredReviews,
    getServerReviewsSnapshot,
  );

  const recordDecision = useCallback(
    ({
      event,
      strategy,
      decision,
      rejectReason,
    }: {
      event: HotEvent;
      strategy: Strategy | null | undefined;
      decision: ReviewDecision;
      rejectReason?: ReviewRejectReason;
    }) => {
      const current = readStoredReviews();
      const next = createReviewRecord({
        event,
        strategy,
        decision,
        rejectReason,
        previous: current.find((record) => record.eventId === event.id),
      });
      writeStoredReviews(upsertReviewRecord(current, next));
    },
    [],
  );

  const clearReviews = useCallback(() => {
    if (typeof window !== "undefined") {
      cachedRaw = null;
      cachedRecords = EMPTY_REVIEWS;
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  const summary = useMemo(() => summarizeReviewRecords(records), [records]);
  const recommendations = useMemo(
    () => createReviewRecommendations(records),
    [records],
  );

  return {
    records,
    summary,
    recommendations,
    recordDecision,
    clearReviews,
  };
}

function readStoredReviews() {
  if (typeof window === "undefined") return EMPTY_REVIEWS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedRecords = EMPTY_REVIEWS;
      return cachedRecords;
    }
    if (raw === cachedRaw) return cachedRecords;

    const parsed = JSON.parse(raw) as ReviewRecord[];
    cachedRaw = raw;
    cachedRecords = Array.isArray(parsed) ? parsed : EMPTY_REVIEWS;
    return cachedRecords;
  } catch {
    cachedRaw = null;
    cachedRecords = EMPTY_REVIEWS;
    return cachedRecords;
  }
}

function writeStoredReviews(records: ReviewRecord[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(records);
  cachedRaw = raw;
  cachedRecords = records;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getServerReviewsSnapshot() {
  return EMPTY_REVIEWS;
}

function subscribeReviews(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
