export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Nuggets</h1>
          <p className="text-sm text-neutral-500 mt-1">Repositório de insights de produto</p>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
