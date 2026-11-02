import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { can, primaryRole, type AppRole, type Permission } from "@/lib/roles";

export function useCurrentUser() {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("display_name, email").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const list = (roles ?? []).map((r) => r.role as AppRole);
      return {
        id: u.user.id,
        name: profile?.display_name ?? u.user.email ?? "Usuario",
        email: profile?.email ?? u.user.email ?? "",
        roles: list,
        role: primaryRole(list),
      };
    },
  });
  const me = q.data ?? null;
  return { ...q, me, can: (p: Permission) => (me ? can(me.roles, p) : false) };
}
