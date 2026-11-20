import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { UserAvatar } from "./UserAvatar";

const NAV = [
  { to: "/", label: "Ballina" },
  { to: "/episodes", label: "Episodet" },
  { to: "/about", label: "Rreth nesh" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    void navigate({ to: "/episodes", search: q ? { q } : {} });
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass border-b border-border" : "bg-gradient-to-b from-background/90 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:h-20 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigimi kryesor">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSearchOpen(true)} aria-label="Kërko episode">
            <Search />
          </Button>

          {loading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-surface-raised" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menyja e llogarisë">
                <UserAvatar name={profile?.username} src={profile?.avatar_url} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{profile?.username ?? "Llogaria ime"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile"><User /> Profili</Link>
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem asChild>
                    <Link to="/upload"><LayoutDashboard /> Paneli i adminit</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut /> Dil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="hero" size="sm" className="hidden rounded-full px-5 sm:inline-flex">
              <Link to="/login">Hyr</Link>
            </Button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Hap menynë">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm border-border bg-background">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <span className="font-display text-xl">PËRTEJ <span className="text-primary">KLASAVE</span></span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 px-4" aria-label="Navigimi në celular">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    activeOptions={{ exact: item.to === "/" }}
                    className="font-display rounded-xl px-3 py-3 text-3xl text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 p-4">
                {user ? (
                  <>
                    <Button asChild variant="subtle" size="xl" onClick={() => setMobileOpen(false)}>
                      <Link to="/profile">Profili im</Link>
                    </Button>
                    {isAdmin ? (
                      <Button asChild variant="subtle" size="xl" onClick={() => setMobileOpen(false)}>
                        <Link to="/upload">Paneli i adminit</Link>
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Button asChild variant="hero" size="xl" onClick={() => setMobileOpen(false)}>
                      <Link to="/login">Hyr</Link>
                    </Button>
                    <Button asChild variant="glass" size="xl" onClick={() => setMobileOpen(false)}>
                      <Link to="/register">Krijo llogari</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="border-border bg-surface sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Kërko episode</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitSearch} className="flex gap-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titulli, tema ose numri i episodit…"
              aria-label="Fjala kyçe"
              className="h-12 bg-background"
            />
            <Button type="submit" variant="hero" className="h-12 px-6">Kërko</Button>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
