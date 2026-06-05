export const dynamic = "force-dynamic";
import OriginShell from "./_origin-shell";

export default function OriginLayout({ children }: { children: React.ReactNode }) {
  return <OriginShell>{children}</OriginShell>;
}
