export const JOIN_EMPTY_MS = 8000;

export function wingmanWaitMessage(input: {
  role: "Host" | "Join";
  room: string;
  waitedMs: number;
  remoteCount: number;
  linkedCount: number;
}): string | null {
  if (input.role !== "Join") return null;
  if (input.linkedCount > 0 || input.remoteCount > 0) return null;
  if (input.waitedMs < JOIN_EMPTY_MS) return null;
  return `No one is in room ${input.room}. That code looks empty or wrong.`;
}
