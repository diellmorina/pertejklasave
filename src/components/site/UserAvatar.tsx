import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({ name, src, className }: { name?: string | null | undefined; src?: string | null | undefined; className?: string | undefined }) {
  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();
  return (
    <Avatar className={cn("h-9 w-9 border border-border", className)}>
      {src ? <AvatarImage src={src} alt={name ?? "Foto e profilit"} className="object-cover" /> : null}
      <AvatarFallback className="bg-surface-raised text-xs font-semibold text-foreground">{initials}</AvatarFallback>
    </Avatar>
  );
}
