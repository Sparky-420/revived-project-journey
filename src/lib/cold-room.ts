import { restStatus } from "@/lib/formula";

export function coldRoomHours(enteredAt: string, now: number): number {
  return Math.max(0, (now - Date.parse(enteredAt)) / 3_600_000);
}

export function coldRoomStatus(enteredAt: string, now: number) {
  return restStatus(coldRoomHours(enteredAt, now));
}

export function fifoBags<T extends { entered_cold_room_at: string; id: string }>(bags: T[]): T[] {
  return [...bags].sort((a, b) => Date.parse(a.entered_cold_room_at) - Date.parse(b.entered_cold_room_at) || a.id.localeCompare(b.id));
}