import NavBar from "@/components/NavBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <NavBar />
      <main className="max-w-4xl mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
