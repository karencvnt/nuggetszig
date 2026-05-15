import { AppShell } from "@/components/ui/app-shell";
import { ToastProvider } from "@/components/ui/toast-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
