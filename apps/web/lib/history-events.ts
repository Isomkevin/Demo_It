export const HISTORY_CHANGED_EVENT = "demo-it:history-changed";

export function notifyHistoryChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HISTORY_CHANGED_EVENT));
  }
}
