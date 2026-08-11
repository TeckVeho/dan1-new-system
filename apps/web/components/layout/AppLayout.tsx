import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { ImpersonationBar } from "./ImpersonationBar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ImpersonationBar />
        <AppHeader />
        <main className="flex-1 overflow-auto">
          <div className="w-full px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
