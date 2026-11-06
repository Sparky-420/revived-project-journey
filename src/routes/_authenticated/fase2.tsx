import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { coldRoomQuery } from "@/lib/cold-room-query";
import { coldRoomStatus } from "@/lib/cold-room";
import { meatFromCuredBag, phase2ForMeat, phase2TheoreticalKg } from "@/lib/formula";
import { productionKg as kg } from "@/lib/phase2-query";

export const Route = createFileRoute("/_authenticated/fase2")({
  head: () => ({ meta: [
    { title: "Fase 2 · Molienda y Embutido · Don Cangrejo Pro" },
    { name: "description", content: "Retiro de carne curada por lote, molienda, ingredientes y responsables de producción." },
    { property: "og:title", content: "Fase 2 · Don Cangrejo Pro" },
    { property: "og:description", content: "Molienda y embutido con trazabilidad por lote e ingredientes." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coldRoomQuery),
  pendingComponent: () => <main className="p-6">Cargando lotes…</main>,
  errorComponent: ({ reset }) => <main className="space-y-4 p-6"><p>No se pudieron cargar los lotes.</p><Button onClick={reset}>Reintentar</Button><Link to="/panel" className="block text-primary">← Panel</Link></main>,
  component: Phase2,
});

function Phase2() {
  const { me, can } = useCurrentUser();
  const { data: bags } = useSuspenseQuery(coldRoomQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [take, setTake] = useState<Record<string, string>>({});
  const [water, setWater] = useState(10);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const num = (v?: string) => Number((v ?? "").replace(",", ".")) || 0;
  const picked = bags.map((lot) => ({ lot, kg: Math.min(num(take[lot.id]), lot.available_kg) })).filter((x) => x.kg > 0);
  const overdraw = bags.some((lot) => num(take[lot.id]) > lot.available_kg + 0.0005);
  const cured = picked.reduce((sum, x) => sum + x.kg, 0);
  const meat = picked.reduce((sum, x) => sum + meatFromCuredBag(x.kg, x.lot.clean_weight_kg, x.lot.premix_total_g), 0);
  const waterPct = can("water:adjust") ? water : 10;
  const recipe = phase2ForMeat(meat, waterPct);
  const eligible = bags;
  const visible = eligible.filter((bag) => bag.lot_number.toLowerCase().includes(search.toLowerCase()));
  const responsible = name.trim() || me?.name || "";

  async function start() {
    if (busy || overdraw || !picked.length || !responsible || !can("batches:capture")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("start_phase2_lots", { p_items: picked.map((x) => ({ batch_id: x.lot.id, kg: x.kg })), p_water_pct: waterPct, p_operator_name: responsible });
      if (error) throw error;
      await Promise.all([qc.invalidateQueries({ queryKey: ["cold-room"] }), qc.invalidateQueries({ queryKey: ["phase2"] })]);
      toast.success("Molienda iniciada. Kilos descontados de Cámara Fría.");
      await navigate({ to: "/rendimiento" });
    } catch {
      toast.error("No se pudo iniciar. Revisa los kilos disponibles.");
      void qc.invalidateQueries({ queryKey: ["cold-room"] });
    } finally { setBusy(false); }
  }

  if (!can("batches:capture")) return <main className="p-6">Sin acceso. <Link to="/panel" className="text-primary">← Panel</Link></main>;
  const rows = [["Ajo fresco · 0.6%", recipe.ajoG, "g"], ["Guajillo · 1.5%", recipe.guajilloG, "g"], ["Pimentón · 0.4%", recipe.pimentonG, "g"], ["Especias / FABPSA · 0.6%", recipe.especiasG, "g"], ["Agua helada", recipe.aguaMl, "ml"]] as const;

  return <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 text-foreground">
    <nav className="flex flex-wrap justify-between gap-2 text-sm text-primary"><Link to="/panel">← Panel</Link><Link to="/rendimiento">Lotes y pesaje →</Link></nav>
    <h1 className="my-5 flex items-center gap-2 text-2xl font-black"><Flame className="size-6 shrink-0" />Fase 2 · Molienda</h1>
    <fieldset disabled={busy} className="min-w-0">
      <section className="border-t border-border py-5">
        <h2 className="mb-3 font-bold">1 · Carne a retirar por lote</h2>
        <Input aria-label="Buscar lote" type="search" placeholder="Buscar lote" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="my-3 flex flex-wrap items-center justify-between gap-2 text-sm"><span>{picked.length} lotes · {kg(cured)}</span><Button size="sm" variant="outline" onClick={() => setTake({})} disabled={!picked.length}>Limpiar</Button></div>
        <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
          {visible.map((lot) => {
            const st = coldRoomStatus(lot.entered_cold_room_at, Date.now()); const attention = st === "attention";
            const over = num(take[lot.id]) > lot.available_kg + 0.0005;
            return <li key={lot.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0"><b className="block break-all text-sm">{lot.lot_number}</b><span className={`block text-xs ${attention ? "text-cold-attention" : "text-cold-ready"}`}>{attention ? "Atención · más de 48 h" : st === "resting" ? "En reposo · menos de 24 h" : "Listo · 24–48 h"}</span></span><span className="shrink-0 text-right text-sm"><b>{kg(lot.available_kg)}</b><span className="block text-xs text-muted-foreground">disponibles</span></span></div>
              <div className="mt-2 flex items-center gap-2"><Input aria-label={`Kilos a retirar de ${lot.lot_number}`} inputMode="decimal" placeholder="Kilos a retirar" className={`h-11 ${over ? "border-destructive" : ""}`} value={take[lot.id] ?? ""} onChange={(e) => setTake((t) => ({ ...t, [lot.id]: e.target.value }))} /><Button size="sm" variant="outline" className="h-11 shrink-0" onClick={() => setTake((t) => ({ ...t, [lot.id]: String(lot.available_kg) }))}>Todo</Button></div>
              {over && <p className="mt-1 text-xs text-destructive">Máximo {kg(lot.available_kg)}</p>}
            </li>;
          })}
        </ul>
        {visible.length === 0 && <p className="py-6 text-sm text-muted-foreground">{eligible.length ? "Sin coincidencias." : "No hay lotes en Cámara Fría."}</p>}
        {picked.some((x) => coldRoomStatus(x.lot.entered_cold_room_at, Date.now()) === "attention") && <p role="alert" className="mt-3 text-sm text-cold-attention">Lotes con más de 48 h: verificar calidad antes de moler.</p>}
      </section>
      <section className="border-t border-border py-5">
        <h2 className="mb-3 flex items-center gap-2 font-bold">2 · Tabla de ingredientes <LockKeyhole className="size-4 text-muted-foreground" /></h2>
        <dl className="mb-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Carne limpia equivalente</dt><dd className="font-bold">{kg(meat)}</dd></div><div><dt className="text-muted-foreground">Carne + premix</dt><dd className="font-bold">{kg(cured)}</dd></div></dl>
        <div role="group" aria-label="Porcentaje de agua" className="mb-4 flex flex-wrap gap-2">{[10, 11, 12].map((value) => <Button key={value} size="sm" variant={waterPct === value ? "secondary" : "outline"} aria-pressed={waterPct === value} disabled={!can("water:adjust")} onClick={() => setWater(value)}>Agua {value}%</Button>)}</div>
        <dl className="divide-y divide-border">{rows.map(([label, value, unit]) => <div key={label} className="flex justify-between gap-3 py-3 text-sm"><dt>{label}</dt><dd className="shrink-0 font-bold tabular-nums">{value.toLocaleString("es-MX", { maximumFractionDigits: 1 })} {unit}</dd></div>)}</dl>
        <p className="mt-2 text-xs text-muted-foreground">Agua de hidratación del guajillo no incluida.</p>
        <p className="mt-4 flex flex-wrap justify-between gap-2 font-bold">Peso teórico <span>{kg(phase2TheoreticalKg(cured, meat, waterPct))}</span></p>
      </section>
      <section className="border-t border-border py-5"><label className="text-sm">Responsable de molienda y embutido<Input className="mt-2 h-12" value={name} placeholder={me?.name} maxLength={200} onChange={(e) => setName(e.target.value)} /></label></section>
      <Button className="h-auto min-h-12 w-full whitespace-normal" disabled={!picked.length || overdraw || !responsible || busy} onClick={start}>{busy ? "Iniciando…" : "Iniciar molienda y descontar kilos"}</Button>
    </fieldset>
  </main>;
}