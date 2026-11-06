import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock3, RefreshCw, Search, Snowflake } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import { coldRoomHours, coldRoomStatus } from "@/lib/cold-room";
import { coldRoomQuery } from "@/lib/cold-room-query";
import type { RestStatus } from "@/lib/formula";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/camara-fria")({
  head: () => ({ meta: [
    { title: "Cámara Fría · Don Cangrejo Pro" },
    { name: "description", content: "Stock de carne curada, bolsas fechadas y semáforo de reposo en Cámara Fría." },
    { property: "og:title", content: "Cámara Fría · Don Cangrejo Pro" },
    { property: "og:description", content: "Bolsas en refrigeración, pesos reales y tiempos de curado por lote." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coldRoomQuery),
  pendingComponent: () => <main className="p-6 text-muted-foreground">Cargando Cámara Fría…</main>,
  errorComponent: ({ reset }) => <main className="space-y-4 p-6 text-foreground"><p>No se pudo cargar Cámara Fría.</p><Button onClick={reset}>Reintentar</Button><Link to="/panel" className="block text-primary">← Panel</Link></main>,
  component: ColdRoom,
});

const states: { value: RestStatus; label: string; range: string; color: string }[] = [
  { value: "ready", label: "Listos para moler", range: "24–48 h", color: "text-cold-ready" },
  { value: "attention", label: "Atención", range: ">48 h", color: "text-cold-attention" },
  { value: "resting", label: "En reposo", range: "<24 h", color: "text-cold-resting" },
];
const kg = (value: number) => `${value.toLocaleString("es-MX", { maximumFractionDigits: 3 })} kg`;
const duration = (hours: number) => `${Math.floor(hours)} h ${Math.floor((hours % 1) * 60)} min`;

function ColdRoom() {
  const { can } = useCurrentUser();
  const { data: bags, refetch, isFetching, isRefetchError } = useSuspenseQuery(coldRoomQuery);
  const [now, setNow] = useState(0);
  const [filter, setFilter] = useState<RestStatus | "all">("ready");
  const [search, setSearch] = useState("");
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!can("batches:capture")) return <main className="p-6 text-foreground">Sin acceso. <Link to="/panel" className="text-primary">← Panel</Link></main>;
  const total = bags.reduce((sum, bag) => sum + bag.available_kg, 0);
  const needle = search.trim().toLocaleLowerCase("es-MX");
  const visible = bags.filter((bag) => (filter === "all" || coldRoomStatus(bag.entered_cold_room_at, now) === filter)
    && `${bag.lot_number} ${bag.operator_name ?? ""}`.toLocaleLowerCase("es-MX").includes(needle));

  return <main className="mx-auto min-h-screen max-w-3xl bg-background px-4 pb-16 pt-6 text-foreground">
    <Link to="/panel" className="text-sm text-primary">← Panel</Link>
    <header className="mb-6 mt-3 flex items-center justify-between gap-3">
      <h1 className="flex items-center gap-2 text-2xl font-black"><Snowflake className="size-6 shrink-0" />Cámara Fría</h1>
      <Button variant="outline" size="icon" aria-label="Actualizar" title="Actualizar" disabled={isFetching} onClick={() => { setNow(Date.now()); void refetch(); }}><RefreshCw className={`size-4 ${isFetching ? "motion-safe:animate-spin" : ""}`} /></Button>
    </header>
    <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-border py-4 sm:grid-cols-4">
      <div><dt className="text-sm text-muted-foreground">Total en frío</dt><dd className="text-xl font-bold">{kg(total)}</dd><dd className="text-xs text-muted-foreground">{bags.length} lotes</dd></div>
      {states.map((state) => {
        const group = bags.filter((bag) => coldRoomStatus(bag.entered_cold_room_at, now) === state.value);
        return <div key={state.value}><dt className={`text-sm ${state.color}`}>{state.label}</dt><dd className="text-xl font-bold">{kg(group.reduce((sum, bag) => sum + bag.available_kg, 0))}</dd><dd className="text-xs text-muted-foreground">{group.length} lotes · {state.range}</dd></div>;
      })}
    </dl>
    <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Estado de los lotes">
      {states.map((state) => <Button key={state.value} size="sm" variant={filter === state.value ? "secondary" : "outline"} aria-pressed={filter === state.value} className={state.color} onClick={() => setFilter(state.value)}>{state.label}</Button>)}
      <Button size="sm" variant={filter === "all" ? "secondary" : "outline"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Ver todas</Button>
    </div>
    <label className="mb-5 flex items-center gap-2 rounded-lg border border-input px-3 py-2"><Search className="size-4 shrink-0 text-muted-foreground" /><input type="search" aria-label="Buscar lote" placeholder="Buscar lote" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 w-full bg-transparent text-sm text-foreground outline-none" /></label>
    {isRefetchError && <p role="alert" className="mb-4 text-sm text-destructive">No se pudo actualizar. Se muestran los últimos datos cargados.</p>}
    <ul className="space-y-3">
      {visible.map((bag) => {
        const hours = coldRoomHours(bag.entered_cold_room_at, now);
        const state = states.find((item) => item.value === coldRoomStatus(bag.entered_cold_room_at, now));
        return <li key={bag.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-all font-bold text-card-foreground">{bag.lot_number}</h2><b className="shrink-0 text-lg">{kg(bag.available_kg)}</b></div>
          <p className={`mt-2 flex items-center gap-2 text-sm font-semibold ${state?.color ?? ""}`}><Clock3 className="size-4 shrink-0" />{state?.label} · {duration(hours)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hours < 24 ? `Faltan ${duration(24 - hours)} para molienda` : hours > 48 ? `Excedida por ${duration(hours - 48)}` : "Lista para Fase 2"}</p>
          <p className="mt-3 break-words text-sm text-muted-foreground">Lote: {bag.phase1_batches?.lot_number ?? "—"} · Responsable: {bag.operator_name ?? "Sin registrar"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Ingreso: <time dateTime={bag.entered_cold_room_at}>{new Date(bag.entered_cold_room_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</time></p>
        </li>;
      })}
    </ul>
    {visible.length === 0 && <p className="border-t border-border py-8 text-center text-sm text-muted-foreground">{bags.length === 0 ? "Aún no hay lotes en Cámara Fría." : search ? "No hay lotes que coincidan con la búsqueda." : "No hay lotes en este estado."}</p>}
  </main>;
}