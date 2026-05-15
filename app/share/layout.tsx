export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="h-14 bg-white border-b border-neutral-200 flex items-center px-6">
        <span className="text-base font-bold text-brand-600">Nuggets</span>
      </header>
      <main>{children}</main>
    </div>
  );
}
