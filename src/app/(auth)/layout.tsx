export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
      <div className="relative mx-auto flex max-w-md flex-col px-4 py-12 sm:py-20">{children}</div>
    </div>
  );
}
