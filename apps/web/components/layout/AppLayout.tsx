import { Sidebar } from "./Sidebar";
import { ImpersonationBar } from "./ImpersonationBar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <ImpersonationBar />
        <div className="w-full px-5 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
