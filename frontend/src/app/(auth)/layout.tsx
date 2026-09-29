export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
