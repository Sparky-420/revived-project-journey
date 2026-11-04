import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fifoBags } from "@/lib/cold-room";

async function fetchColdRoom() {
  const page = (start: number) => supabase.from("phase1_bags")
    .select("id, bag_code, actual_weight_kg, entered_cold_room_at, phase1_batches(lot_number, operator_name)")
    // Phase 1 currently stores available bags as 'resting'; readiness is time-derived.
    .in("status", ["resting", "in_cold_room"])
    .order("entered_cold_room_at").order("id").range(start, start + 499);
  const first = await page(0);
  if (first.error) throw first.error;
  const bags = first.data ?? [];
  let count = bags.length;
  while (count === 500) {
    const next = await page(bags.length);
    if (next.error) throw next.error;
    count = next.data?.length ?? 0;
    bags.push(...(next.data ?? []));
  }
  return fifoBags(bags);
}

export const coldRoomQuery = queryOptions({
  queryKey: ["cold-room"],
  queryFn: fetchColdRoom,
  staleTime: 60_000,
});