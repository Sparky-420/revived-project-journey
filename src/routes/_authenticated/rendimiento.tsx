import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { phase2Query, productionKg as kg, productionNumber } from "@/lib/phase2-query";
import { yieldPct } from "@/lib/formula";

export const Route = createFileRoute("/_authenticated/rendimiento")({
  head: () => ({ meta: [
    { title: "Pesaje final y Rendimiento · Don Cangrejo Pro" },
    { name: "description", content: "Registros de báscula, cierre de lotes, calidad y rendimiento real de longaniza." },
    { property: "og:title", content: "Pesaje final y Rendimiento · Don Cangrejo Pro" },
    { property: "og:description", content: "Peso terminado frente al teórico y trazabilidad del lote." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(phase2Query),
  pendingComponent: () => <main className="p-6">Cargando lotes…</main>,
  errorComponent: ({ reset }) => <main className="space-y-4 p-6"><p>No se pudieron cargar los lotes.</p><Button onClick={reset}>Reintentar</Button><Link to="/panel" className="block text-primary">← Panel</Link></main>,
  component: YieldPage,
});

function YieldPage() {
  const { me, can } = useCurrentUser();
  const { data: batches } = useSuspenseQuery(phase2Query);
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"processing" | "completed">("processing");
  const visible = batches.filter((batch) => batch.status === view);
  const batch = visible.find((item) => item.id === activeId) ?? visible[0];
  const weights = batch?.scale_weights_kg ?? [];
  const total = weights.reduce((sum, value) => sum + value, 0);
  const responsible = name.trim() || me?.name || "";

  function resetForm() { setWeight(""); setName(""); setNotes(""); setConfirmed(false); }
  async function save(action: "add" | "remove" | "close", index?: number) {
    if (!batch || busy || !can("batches:capture")) return;
    const value = productionNumber(weight);
    if (action === "add" && (!Number.isFinite(value) || value <= 0)) return;
    if (action === "close" && (!confirmed || !total || !responsible)) return;
    setBusy(true);
    try {
      const result = action === "close"
        ? await supabase.rpc("close_phase2", { p_batch_id: batch.id, p_quality_name: responsible, p_notes: notes })
        : await supabase.rpc("phase2_scale", { p_batch_id: batch.id, ...(action === "add" ? { p_weight: value } : typeof index === "number" ? { p_remove_index: index } : {}) });
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["phase2"] });
      setConfirmed(false);
      if (action === "close") { setView("completed"); setActiveId(batch.id); toast.success("Lote cerrado. Rendimiento registrado."); }
      else { setWeight(""); toast.success(action === "add" ? "Pesaje guardado" : "Pesaje eliminado"); }
    } catch { toast.error("No se pudo guardar. Revisa si el lote sigue abierto."); void qc.invalidateQueries({ queryKey: ["phase2"] }); }
    finally { setBusy(false); }
  }

  if (!can("batches:capture")) return <main className="p-6">Sin acceso. <Link to="/panel" className="text-primary">← Panel</Link></main>;
  return <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-6 text-foreground">
    <nav className="flex justify-between gap-2 text-sm text-primary"><Link to="/panel">← Panel</Link><Link to="/fase2">Nueva molienda →</Link></nav>
    <h1 className="my-5 flex items-center gap-2 text-2xl font-black"><Scale className="size-6 shrink-0" />Pesaje y rendimiento</h1>
    <div className="mb-4 flex gap-2">{(["processing", "completed"] as const).map((status) => <Button key={status} variant={view === status ? "secondary" : "outline"} aria-pressed={view === status} disabled={busy} onClick={() => { setView(status); setActiveId(null); resetForm(); }}>{status === "processing" ? "En producción" : "Cerrados"}</Button>)}</div>
    <ul className="mb-6 flex gap-2 overflow-x-auto pb-2">{visible.map((item) => <li key={item.id}><Button variant={batch?.id === item.id ? "secondary" : "outline"} disabled={busy} onClick={() => { setActiveId(item.id); resetForm(); }}>{item.lot_number}</Button></li>)}</ul>
    {!batch ? <p className="border-t border-border py-8 text-muted-foreground">No hay lotes {view === "processing" ? "en producción" : "cerrados"}.</p> : <>
      <h2 className="break-all font-bold">{batch.lot_number}</h2>
      <p className="my-2 text-sm text-muted-foreground">Molienda y embutido: {batch.operator_name}</p>
      <dl className="my-5 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Carne limpia</dt><dd className="font-bold">{kg(batch.meat_weight_kg)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Peso teórico</dt><dd className="font-bold">{kg(batch.theoretical_weight_kg)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Peso terminado</dt><dd className="font-bold text-cold-ready">{kg(total)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">{batch.status === "completed" ? "Rendimiento final" : "Rendimiento parcial"}</dt><dd className="font-bold">{yieldPct(total, batch.meat_weight_kg).toFixed(2)}%</dd></div>
      </dl>
      <p className="mb-5 text-sm text-muted-foreground">Diferencia vs. teórico: {kg(total - batch.theoretical_weight_kg)}</p>
      <fieldset disabled={busy} className="min-w-0">
        {batch.status === "processing" && <form className="mb-5 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void save("add"); }}><label className="min-w-0 flex-1 text-sm">Peso de báscula (kg)<Input className="mt-2 h-12" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.000" /></label><Button type="submit" className="h-12" disabled={!Number.isFinite(productionNumber(weight)) || productionNumber(weight) <= 0}><Plus className="size-4" />Agregar pesaje</Button></form>}
        <ol className="divide-y divide-border">{weights.map((value, index) => <li key={index} className="flex items-center justify-between gap-3 py-3 text-sm"><span>Pesaje {index + 1} · <b>{kg(value)}</b></span>{batch.status === "processing" && <Button size="icon" variant="outline" aria-label={`Eliminar pesaje ${index + 1}`} title={`Eliminar pesaje ${index + 1}`} onClick={() => void save("remove", index + 1)}><Trash2 className="size-4" /></Button>}</li>)}</ol>
        {batch.status === "processing" ? <section className="mt-5 space-y-4 border-t border-border py-5">
          <label className="block text-sm">Responsable de pesaje final y calidad<Input className="mt-2 h-12" placeholder={me?.name} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm">Observaciones de calidad<Input className="mt-2 h-12" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} /></label>
          <label className="flex items-start gap-3 text-sm"><Checkbox aria-label="Todo el lote está pesado y calidad revisada" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} /><span>Todo el lote está pesado y calidad revisada</span></label>
          <Button className="h-12 w-full" disabled={!confirmed || total <= 0 || !responsible || busy} onClick={() => void save("close")}>{busy ? "Guardando…" : "Cerrar lote y registrar rendimiento"}</Button>
        </section> : <section className="my-5 border-t border-border py-4 text-sm"><p className="font-bold text-cold-ready">Lote cerrado · {batch.closed_at ? new Date(batch.closed_at).toLocaleString("es-MX") : ""}</p><p className="mt-2">Pesaje y calidad: {batch.quality_name}</p>{batch.quality_notes && <p className="mt-2 break-words text-muted-foreground">{batch.quality_notes}</p>}</section>}
      </fieldset>
      <details className="border-t border-border py-4 text-sm"><summary className="cursor-pointer font-bold">Origen de bolsas e ingredientes</summary><ul className="mt-3 space-y-3">{batch.phase2_sources.map((source) => <li key={source.id} className="break-words"><b>{source.bag_code}</b> · {kg(source.cured_weight_kg)}<p className="text-muted-foreground">Recepción: {source.reception_name ?? "—"} · {source.source_lot}</p></li>)}</ul><p className="mt-4 text-muted-foreground">Ajo {batch.garlic_g.toFixed(1)} g · Guajillo {batch.guajillo_g.toFixed(1)} g · Pimentón {batch.paprika_g.toFixed(1)} g · Especias {batch.spices_g.toFixed(1)} g · Agua {batch.water_ml.toFixed(1)} ml ({batch.water_pct}%)</p></details>
    </>}
  </main>;
}