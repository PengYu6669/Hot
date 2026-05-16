"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { HotEvent, Strategy } from "@/lib/hot-events";
import {
  createOperationTask,
  createRuleFeedback,
  summarizeOperationTasks,
  upsertOperationTask,
  type OperationTask,
  type OperationTaskStatus,
} from "@/lib/operation-tasks";

const STORAGE_KEY = "hotagent-operation-tasks";
const CHANGE_EVENT = "hotagent-operation-tasks-change";
const EMPTY_TASKS: OperationTask[] = [];
let cachedRaw: string | null = null;
let cachedTasks: OperationTask[] = EMPTY_TASKS;

export function useOperationTasks() {
  const tasks = useSyncExternalStore(
    subscribeTasks,
    readStoredTasks,
    getServerTasksSnapshot,
  );

  const upsertTask = useCallback(
    ({
      event,
      strategy,
      status,
    }: {
      event: HotEvent;
      strategy: Strategy | null | undefined;
      status: OperationTaskStatus;
    }) => {
      const current = readStoredTasks();
      const next = createOperationTask({
        event,
        strategy,
        status,
        previous: current.find((task) => task.eventId === event.id),
      });
      writeStoredTasks(upsertOperationTask(current, next));
    },
    [],
  );

  const clearTasks = useCallback(() => {
    if (typeof window !== "undefined") {
      cachedRaw = null;
      cachedTasks = EMPTY_TASKS;
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  }, []);

  const summary = useMemo(() => summarizeOperationTasks(tasks), [tasks]);
  const feedback = useMemo(() => createRuleFeedback(tasks), [tasks]);

  return {
    tasks,
    summary,
    feedback,
    upsertTask,
    clearTasks,
  };
}

function readStoredTasks() {
  if (typeof window === "undefined") return EMPTY_TASKS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedRaw = null;
      cachedTasks = EMPTY_TASKS;
      return cachedTasks;
    }
    if (raw === cachedRaw) return cachedTasks;

    const parsed = JSON.parse(raw) as OperationTask[];
    cachedRaw = raw;
    cachedTasks = Array.isArray(parsed) ? parsed : EMPTY_TASKS;
    return cachedTasks;
  } catch {
    cachedRaw = null;
    cachedTasks = EMPTY_TASKS;
    return cachedTasks;
  }
}

function writeStoredTasks(tasks: OperationTask[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(tasks);
  cachedRaw = raw;
  cachedTasks = tasks;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function getServerTasksSnapshot() {
  return EMPTY_TASKS;
}

function subscribeTasks(onStoreChange: () => void) {
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
