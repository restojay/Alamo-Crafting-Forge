import type { TaskState } from "../db/types";

const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  new: ["in_progress", "escalated"],
  in_progress: ["awaiting_response", "done", "escalated"],
  awaiting_response: ["in_progress", "done", "escalated"],
  done: [],
  escalated: [],
};

export function isValidTransition(from: TaskState, to: TaskState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transition(from: TaskState, to: TaskState): TaskState {
  if (!isValidTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} -> ${to}`);
  }
  return to;
}
