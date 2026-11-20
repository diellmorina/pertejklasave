import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Paneli i adminit — PËRTEJ KLASAVE" },
      { name: "description", content: "Paneli i administrimit të PËRTEJ KLASAVE." },
      { property: "og:title", content: "Paneli i adminit — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Paneli i administrimit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Upload,
});

function Upload() {
  const { isAdmin, adminLoading } = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="eyebrow">Paneli i adminit</p>
      <h1 className="font-display mt-3 text-4xl">
        {adminLoading ? "Duke kontrolluar…" : isAdmin ? "Paneli po ndërtohet." : "Nuk ke leje për këtë faqe."}
      </h1>
      <Button asChild variant="glass" className="mt-8"><Link to="/">Kthehu në ballinë</Link></Button>
    </div>
  );
}
