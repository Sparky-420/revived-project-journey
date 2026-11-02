import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Don Cangrejo Pro" },
      { name: "description", content: "Acceso al control de planta de Don Cangrejo Pro con Google." },
      { property: "og:title", content: "Entrar · Don Cangrejo Pro" },
      { property: "og:description", content: "Acceso seguro para dueño, encargado y operadores de planta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel", replace: true });
    });
  }, [navigate]);

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) {
      toast.error("No se pudo entrar con Google");
      setBusy(false);
      return;
    }
    if (r.redirected) return;
    navigate({ to: "/panel", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-3xl">🥩</div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Don Cangrejo Pro</h1>
          <p className="mt-2 text-sm text-muted-foreground">Control de planta · Charcutería de precisión</p>
        </div>
        <Button size="lg" className="h-14 w-full text-base" onClick={google} disabled={busy}>
          {busy ? "Conectando…" : "Entrar con Google"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Después de entrar podrás activar huella / Face ID y un PIN de respaldo en este teléfono.
        </p>
      </div>
    </main>
  );
}
