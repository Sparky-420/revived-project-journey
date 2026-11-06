import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fifoBags } from "@/lib/cold-room";

// Cold room is tracked per lot: available_kg drops with each partial Phase 2 withdrawal.
async function fetchColdRoom() {
  const { data, error } = await supabase.from("phase1_batches")
    .select("id, lot_number, available_kg, cured_weight_kg, clean_weight_kg, premix_total_g, operator_name, entered_cold_room_at")
    .gt("available_kg", 0)
    .order("entered_cold_room_at").limit(1000);
  if (error) throw error;
  return fifoBags((data ?? []).map((l) => ({ ...l, available_kg: Number(l.available_kg), cured_weight_kg: Number(l.cured_weight_kg), clean_weight_kg: Number(l.clean_weight_kg) })));
}

export const coldRoomQuery = queryOptions({
  queryKey: ["cold-room"],
  queryFn: fetchColdRoom,
  staleTime: 60_000,
});
