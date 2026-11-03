import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Don Cangrejo Pro · Control de planta de longaniza" },
      { name: "description", content: "Curado, cámara fría, molienda, inventario y rendimiento de longaniza por roles." },
      { property: "og:title", content: "Don Cangrejo Pro · Control de planta" },
      { property: "og:description", content: "Producción de longaniza en dos fases con trazabilidad y roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="text-5xl">🥩</div>
      <h1 className="text-4xl font-black tracking-tight text-foreground">Don Cangrejo Pro</h1>
      <p className="max-w-sm text-muted-foreground">
        Fase 1 de curado, cámara fría, Fase 2 de molienda y embutido, inventario y rendimiento — con acceso por rol.
      </p>
      <Link to="/panel" className="rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground">Entrar a producción</Link>
    </main>
  );
}
