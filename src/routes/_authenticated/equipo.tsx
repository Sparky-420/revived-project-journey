import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-auth";
import { ROLE_LABELS, primaryRole, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo y roles · Don Cangrejo Pro" },
      { name: "description", content: "Asignación de roles de dueño, encargado y operador." },
      { property: "og:title", content: "Equipo y roles · Don Cangrejo Pro" },
      { property: "og:description", content: "Gestión de accesos del personal de planta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipo,
});

function Equipo() {
  const { me, can } = useCurrentUser();
  const qc = useQueryClient();
  const team = useQuery({
    queryKey: ["team"],
    enabled: can("users:manage"),
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, email").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: primaryRole((roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole)),
      }));
    },
  });

  async function setRole(userId: string, role: AppRole) {
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (del.error || ins.error) toast.error("No se pudo cambiar el rol");
    else toast.success("Rol actualizado");
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  if (!can("users:manage")) {
    return <main className="p-6 text-foreground">Solo el dueño puede ver esta pantalla. <Link to="/panel" className="text-primary underline">Volver</Link></main>;
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-background px-4 pt-6">
      <Link to="/panel" className="text-sm text-primary">← Panel</Link>
      <h1 className="mb-1 mt-2 text-2xl font-black text-foreground">Equipo y roles</h1>
      <p className="mb-5 text-sm text-muted-foreground">Cada persona entra con su cuenta de Google y aparece aquí como operador.</p>
      <ul className="space-y-2">
        {team.data?.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0">
              <div className="truncate font-semibold text-card-foreground">{p.display_name}</div>
              <div className="truncate text-xs text-muted-foreground">{p.email}</div>
            </div>
            {p.id === me?.id ? (
              <span className="text-sm font-semibold text-primary">{ROLE_LABELS.owner}</span>
            ) : (
              <select
                className="rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground"
                value={p.role ?? "operator"}
                onChange={(e) => setRole(p.id, e.target.value as AppRole)}
                aria-label={`Rol de ${p.display_name}`}
              >
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
