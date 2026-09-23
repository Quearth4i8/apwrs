import { ConsoleProvider } from "@/components/app-context";
import { AppShell } from "@/components/app-shell";

export default function FarmLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleProvider>
      <AppShell role="farmer">{children}</AppShell>
    </ConsoleProvider>
  );
}
