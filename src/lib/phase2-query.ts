import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const phase2Query = queryOptions({
  queryKey: ["phase2"],
  queryFn: async () => {
    const { data, error } = await supabase.from("phase2_batches")
      .select("*, phase2_sources(*), phase2_lot_sources(*)").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const productionKg = (value: number) => `${value.toLocaleString("es-MX", { maximumFractionDigits: 3 })} kg`;
export const productionNumber = (value: string) => Number(value.replace(",", "."));