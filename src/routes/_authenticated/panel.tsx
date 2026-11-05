import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { coldRoomQuery } from "@/lib/cold-room-query";
import { coldRoomStatus } from "@/lib/cold-room";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-auth";
import { ROLE_LABELS, type Permission } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel de planta · Don Cangrejo Pro" },
      { name: "description", content: "Módulos de producción, cámara fría, inventario y rendimiento." },
      { property: "og:title", content: "Panel de planta · Don Cangrejo Pro" },
      { property: "og:description", content: "Módulos de producción de longaniza por rol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Panel,
});

const MODULES: { icon: string; title: string; desc: string; need: Permission; to?: "/fase1" | "/camara-fria" | "/fase2" | "/rendimiento" }[] = [
  { icon: "🧪", title: "Fase 1 · Recepción y Curado", desc: "Compra bruta, merma, premix y bolsas fechadas", need: "batches:capture", to: "/fase1" },
  { icon: "❄️", title: "Cámara Fría", desc: "Bolsas en reposo con semáforo 24–48 h", need: "batches:capture", to: "/camara-fria" },
  { icon: "🌶️", title: "Fase 2 · Molienda y Embutido", desc: "Sazón, agua helada y tabla de pesaje", need: "batches:capture", to: "/fase2" },
  { icon: "⚖️", title: "Rendimiento", desc: "Pesaje final en báscula vs. teórico", need: "batches:capture", to: "/rendimiento" },
  { icon: "📦", title: "Inventario", desc: "4 almacenes, faltantes y capacidad", need: "inventory:manage" },
  { icon: "💰", title: "Costos operativos", desc: "Costo por lote y por kg", need: "finance:costs" },
  { icon: "📈", title: "Márgenes MXN", desc: "Utilidad y escandallo completo", need: "finance:margins" },
  { icon: "🔬", title: "Fórmulas base", desc: "Premix 85/9/6 y receta actual", need: "formula:edit" },
];

function Panel() {
  const { me, can } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const cold = useQuery({ ...coldRoomQuery, enabled: can("batches:capture") });
  const readyKg = (cold.data ?? []).filter((bag) => coldRoomStatus(bag.entered_cold_room_at, Date.now()) === "ready").reduce((sum, bag) => sum + bag.actual_weight_kg, 0);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    sessionStorage.removeItem("dc_unlocked_until");
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Don Cangrejo Pro</h1>
          <p className="text-sm text-muted-foreground">
            {me?.name} · <span className="font-semibold text-primary">{me?.role ? ROLE_LABELS[me.role] : "Sin rol"}</span>
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut}>Salir</Button>
      </header>

      {can("users:manage") && (
        <Link to="/equipo" className="mb-4 block rounded-xl border border-primary/40 bg-primary/10 p-4 text-foreground">
          👥 <span className="font-bold">Equipo y roles</span>
          <span className="block text-sm text-muted-foreground">Asigna quién es encargado u operador</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {MODULES.map((m) => {
          const ok = can(m.need);
          const body = (
            <>
              <div className="text-2xl">{ok ? m.icon : "🔒"}</div>
              <h2 className="mt-2 font-bold text-card-foreground">{m.title}</h2>
              <p className="text-sm text-muted-foreground">{ok ? m.desc : "Bloqueado para tu rol"}</p>
              {ok && <p className="mt-2 text-xs text-muted-foreground">{m.to ? "Abrir →" : "Próximamente"}</p>}
              {ok && m.to === "/camara-fria" && readyKg > 0 && <p className="mt-1 text-xs font-semibold text-cold-ready">{readyKg.toLocaleString("es-MX", { maximumFractionDigits: 3 })} kg listos</p>}
            </>
          );
          const cls = `rounded-xl border border-border bg-card p-4 ${ok ? "" : "opacity-45"}`;
          return ok && m.to ? (
            <Link key={m.title} to={m.to} className={`${cls} block hover:border-primary`}>{body}</Link>
          ) : (
            <div key={m.title} className={cls}>{body}</div>
          );
        })}
      </div>
    </main>
  );
}
