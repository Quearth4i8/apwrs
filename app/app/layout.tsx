import { ConsoleProvider } from "@/components/app-context";
import { AppShell } from "@/components/app-shell";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConsoleProvider>
      <AppShell>{children}</AppShell>
    </ConsoleProvider>
  );
}
