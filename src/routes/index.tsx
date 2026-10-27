import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import legacyCss from "@/legacy/don-cangrejo.css?url";
import { markup } from "@/legacy/markup";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Receta de Don Cangrejo - Longaniza Pro MX" },
      { name: "description", content: "Calculadora y control de producción profesional de longaniza y charcutería." },
      { property: "og:title", content: "La Receta de Don Cangrejo - Longaniza Pro MX" },
      { property: "og:description", content: "Calculadora y control de producción de longaniza: premix, costeo, checklist e historial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#0c0e12" },
    ],
    links: [{ rel: "stylesheet", href: legacyCss }],
  }),
  component: Index,
});

function Index() {
  useEffect(() => {
    import("@/legacy/don-cangrejo.js").then((m) => m.initDonCangrejo());
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
