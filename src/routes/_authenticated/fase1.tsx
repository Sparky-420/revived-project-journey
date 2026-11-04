import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-auth";
import { premixForMeat, curedMassKg, bagWeightWithinTolerance, cleaningYieldPct, PREMIX, BAG_SIZES_KG } from "@/lib/formula";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/fase1")({
  head: () => ({
    meta: [
      { title: "Fase 1 · Recepción y Curado · Don Cangrejo Pro" },
      { name: "description", content: "Captura de compra bruta, merma, premix y bolsas para cámara fría." },
      { property: "og:title", content: "Fase 1 · Recepción y Curado" },
      { property: "og:description", content: "Recepción, limpieza, curado y porcionado de lotes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Fase1,
});

const DOSES = [
  { v: 12, label: "Suave" },
  { v: 13.5, label: "Media" },
  { v: 15, label: "Estándar" },
];

const n = (s: string) => Math.max(0, Number(s.replace(",", ".")) || 0);
const g = (x: number) => `${x.toLocaleString("es-MX", { maximumFractionDigits: 1 })} g`;
const kg = (x: number) => `${x.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;

function lotCode() {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `L-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function Fase1() {
  const { me, can } = useCurrentUser();
  const qc = useQueryClient();
  const [gross, setGross] = useState("");
  const [waste, setWaste] = useState("");
  const [dose, setDose] = useState(15);
  const [bags, setBags] = useState<string[]>([]);
  const [bagWeight, setBagWeight] = useState("");
  const [saving, setSaving] = useState(false);

  const grossKg = n(gross);
  const wasteKg = n(waste);
  const clean = Math.max(0, grossKg - wasteKg);
  const premix = premixForMeat(clean, dose);
  const cured = curedMassKg(clean, premix.totalG);

  const bagTotal = bags.reduce((a, b) => a + n(b), 0);
  const balanced = bagWeightWithinTolerance(bagTotal, cured);
  const valid = grossKg > 0 && wasteKg < grossKg && bags.length > 0 && bags.every((b) => Number.isFinite(n(b)) && n(b) > 0) && balanced;

  function addBag(weight: string) {
    if (!Number.isFinite(n(weight)) || n(weight) <= 0) return;
    setBags((xs) => [...xs, String(n(weight))]);
    setBagWeight("");
  }

  const recent = useQuery({
    queryKey: ["phase1"],
    queryFn: async () => {
      const { data } = await supabase
        .from("phase1_batches")
        .select("id, lot_number, clean_weight_kg, premix_dose_g_per_kg, operator_name, created_at, phase1_bags(count)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  async function save() {
    if (!valid || saving || !can("batches:capture")) return;
    setSaving(true);
    const lot = lotCode();
    const { data: batch, error } = await supabase
      .from("phase1_batches")
      .insert({ lot_number: lot, gross_weight_kg: grossKg, waste_weight_kg: wasteKg, premix_dose_g_per_kg: dose, operator_name: me?.name ?? null })
      .select("id")
      .single();
    if (error || !batch) {
      setSaving(false);
      toast.error("No se pudo guardar el lote");
      return;
    }
    const { error: e2 } = await supabase.from("phase1_bags").insert(
      bags.map((b, i) => ({ batch_id: batch.id, bag_code: `${lot}-B${i + 1}`, target_weight_kg: n(b), actual_weight_kg: n(b) })),
    );
    setSaving(false);
    if (e2) { toast.error("El lote se guardó pero las bolsas no"); return; }
    toast.success(`Lote ${lot} ingresado a Cámara Fría`);
    setGross(""); setWaste(""); setDose(15); setBags([]); setBagWeight("");
    qc.invalidateQueries({ queryKey: ["phase1"] });
  }

  if (!can("batches:capture")) {
    return <main className="p-6 text-foreground">Sin acceso. <Link to="/panel" className="text-primary underline">Volver</Link></main>;
  }

  const input = "w-full rounded-lg border border-input bg-background px-3 py-3 text-lg font-bold text-foreground";

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 pb-16 pt-6">
      <Link to="/panel" className="text-sm text-primary">← Panel</Link>
      <h1 className="mb-4 mt-2 text-2xl font-black text-foreground">🧪 Fase 1 · Recepción y Curado</h1>

      <section className="mb-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-bold text-card-foreground">1 · Recepción y limpieza</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-muted-foreground">Compra bruta (kg)
            <input inputMode="decimal" className={input} value={gross} onChange={(e) => setGross(e.target.value)} placeholder="0" />
          </label>
          <label className="text-sm text-muted-foreground">Merma (kg)
            <input inputMode="decimal" className={input} value={waste} onChange={(e) => setWaste(e.target.value)} placeholder="0" />
          </label>
        </div>
        <div className="mt-3 flex justify-between rounded-lg bg-muted p-3 text-sm">
          <span className="text-muted-foreground">Carne limpia</span>
          <span className="font-black text-foreground">{kg(clean)} · {cleaningYieldPct(grossKg, wasteKg).toFixed(1)}%</span>
        </div>
        {wasteKg >= grossKg && grossKg > 0 && <p className="mt-2 text-sm text-destructive">La merma no puede ser mayor que la compra.</p>}
      </section>

      <section className="mb-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-bold text-card-foreground">2 · Curado · Premix {PREMIX.sal}/{PREMIX.cura}/{PREMIX.azucar}</h2>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {DOSES.map((d) => (
            <button key={d.v} onClick={() => setDose(d.v)}
              className={`rounded-lg border p-2 text-sm font-bold ${dose === d.v ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"}`}>
              {d.v} g/kg<span className="block text-xs font-normal">{d.label}</span>
            </button>
          ))}
        </div>
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between"><span className="text-muted-foreground">Sal de mar ({PREMIX.sal}%)</span><b className="text-foreground">{g(premix.salG)}</b></li>
          <li className="flex justify-between"><span className="text-muted-foreground">Sal de cura Premier ({PREMIX.cura}%)</span><b className="text-foreground">{g(premix.curaG)}</b></li>
          <li className="flex justify-between"><span className="text-muted-foreground">Azúcar refinada ({PREMIX.azucar}%)</span><b className="text-foreground">{g(premix.azucarG)}</b></li>
          <li className="flex justify-between border-t border-border pt-1"><span className="font-bold text-foreground">Total premix</span><b className="text-primary">{g(premix.totalG)}</b></li>
          <li className="flex flex-wrap justify-between gap-2 border-t border-border pt-2"><span className="font-bold text-foreground">Masa curada a refrigeración</span><b className="text-primary">{kg(cured)}</b></li>
        </ul>
      </section>

      <section className="mb-4 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 font-bold text-card-foreground">3 · Porcionado en bolsas</h2>
        <fieldset disabled={saving} className="min-w-0 space-y-3">
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); addBag(bagWeight); }}>
            <label className="min-w-0 flex-1 text-sm text-muted-foreground">Peso de báscula (kg)
              <input inputMode="decimal" className={input} value={bagWeight} onChange={(e) => setBagWeight(e.target.value)} placeholder="0.000" />
            </label>
            <Button type="submit" className="h-12" disabled={!Number.isFinite(n(bagWeight)) || n(bagWeight) <= 0}><Plus className="size-4" /> Agregar bolsa</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {BAG_SIZES_KG.map((weight) => <Button key={weight} type="button" size="sm" variant="outline" onClick={() => addBag(String(weight))}><Plus className="size-3" />{weight} kg</Button>)}
          </div>
        <div className="space-y-2">
          {bags.map((b, i) => (
            <div key={i} className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs text-muted-foreground">Bolsa {i + 1} (kg)
              <input inputMode="decimal" className={input} value={b}
                onChange={(e) => setBags((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))} />
            </label>
            <Button type="button" variant="outline" size="icon" className="mb-1 shrink-0" aria-label={`Eliminar bolsa ${i + 1}`} title={`Eliminar bolsa ${i + 1}`} onClick={() => setBags((xs) => xs.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
        </fieldset>
        <div aria-live="polite" className={`mt-3 space-y-1 text-sm ${bags.length > 0 && !balanced ? "text-destructive" : "text-muted-foreground"}`}>
          <p>Total en bolsas: {kg(bagTotal)} de {kg(cured)}</p>
          <p>{bagTotal > cured ? `Exceso: ${kg(bagTotal - cured)}` : `Faltan: ${kg(cured - bagTotal)}`}</p>
          <p>Margen ±1%: {kg(cured * 0.01)}{balanced ? " · Dentro del margen" : ""}</p>
        </div>
      </section>

      <Button className="w-full py-6 text-base" disabled={!valid || saving} onClick={save}>
        {saving ? "Guardando…" : "❄️ Ingresar lote a Cámara Fría"}
      </Button>

      <h2 className="mb-2 mt-8 font-bold text-foreground">Lotes recientes</h2>
      <ul className="space-y-2">
        {recent.data?.map((r) => (
          <li key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <b className="text-card-foreground">{r.lot_number}</b>
            <span className="block text-muted-foreground">
              {kg(Number(r.clean_weight_kg))} limpios · {r.premix_dose_g_per_kg} g/kg · {(r.phase1_bags as unknown as { count: number }[])[0]?.count ?? 0} bolsas · {r.operator_name ?? ""}
            </span>
          </li>
        ))}
        {recent.data?.length === 0 && <li className="text-sm text-muted-foreground">Aún no hay lotes.</li>}
      </ul>
    </main>
  );
}
