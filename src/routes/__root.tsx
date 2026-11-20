import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/use-auth";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 pt-20">
      <div className="pointer-events-none absolute inset-0 bg-red-haze" />
      <div className="relative max-w-lg text-center">
        <p className="eyebrow">Gabim 404</p>
        <h1 className="font-display mt-4 text-[clamp(5rem,18vw,11rem)] text-foreground">
          4<span className="text-primary">0</span>4
        </h1>
        <h2 className="mt-2 text-2xl font-semibold">Kjo faqe është përtej hartës.</h2>
        <p className="mt-3 text-muted-foreground">
          Faqja që kërkon nuk ekziston ose është zhvendosur. Kthehu te episodet dhe vazhdo bisedën.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="hero" size="xl">
            <Link to="/">Kthehu në ballinë</Link>
          </Button>
          <Button asChild variant="glass" size="xl">
            <Link to="/episodes">Shiko episodet</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Kjo faqe nuk u ngarkua
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Diçka shkoi keq. Provo ta rifreskosh faqen ose kthehu në ballinë.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Provo përsëri
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ballina
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PËRTEJ KLASAVE — Podkasti zyrtar" },
      { name: "description", content: "Podkasti zyrtar PËRTEJ KLASAVE: episode video, biseda dhe komunitet. Përtej klasave. Përtej mendimeve." },
      { name: "author", content: "PËRTEJ KLASAVE" },
      { name: "theme-color", content: "#080808" },
      { property: "og:site_name", content: "PËRTEJ KLASAVE" },
      { property: "og:title", content: "PËRTEJ KLASAVE — Podkasti zyrtar" },
      { property: "og:description", content: "Episode video, biseda dhe komunitet. Përtej klasave. Përtej mendimeve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Geist:wght@300..700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="sq" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/upload");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2">
          Kalo te përmbajtja
        </a>
        {isDashboard ? null : <SiteHeader />}
        <main id="main" className="min-h-screen">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
        {isDashboard ? null : <SiteFooter />}
        <Toaster position="bottom-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
