import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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

const MODULES: { icon: string; title: string; desc: string; need: Permission }[] = [
  { icon: "🧪", title: "Fase 1 · Recepción y Curado", desc: "Compra bruta, merma, premix y bolsas fechadas", need: "batches:capture" },
  { icon: "❄️", title: "Cámara Fría", desc: "Bolsas en reposo con semáforo 24–48 h", need: "batches:capture" },
  { icon: "🌶️", title: "Fase 2 · Molienda y Embutido", desc: "Sazón, agua helada y tabla de pesaje", need: "batches:capture" },
  { icon: "⚖️", title: "Rendimiento", desc: "Pesaje final en báscula vs. teórico", need: "batches:capture" },
  { icon: "📦", title: "Inventario", desc: "4 almacenes, faltantes y capacidad", need: "inventory:manage" },
  { icon: "💰", title: "Costos operativos", desc: "Costo por lote y por kg", need: "finance:costs" },
  { icon: "📈", title: "Márgenes MXN", desc: "Utilidad y escandallo completo", need: "finance:margins" },
  { icon: "🔬", title: "Fórmulas base", desc: "Premix 85/9/6 y receta actual", need: "formula:edit" },
];

function Panel() {
  const { me, can } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

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
          return (
            <div key={m.title} className={`rounded-xl border border-border bg-card p-4 ${ok ? "" : "opacity-45"}`}>
              <div className="text-2xl">{ok ? m.icon : "🔒"}</div>
              <h2 className="mt-2 font-bold text-card-foreground">{m.title}</h2>
              <p className="text-sm text-muted-foreground">{ok ? m.desc : "Bloqueado para tu rol"}</p>
              {ok && <p className="mt-2 text-xs text-muted-foreground">Próximamente</p>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
