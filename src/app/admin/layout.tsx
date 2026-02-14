import Sidebar from "@/components/Sidebar";

const links = [
  { label: "Dashboard", href: "/admin" },
  { label: "Course Approvals", href: "/admin/courses" },
  { label: "Users", href: "/admin/users" },
  { label: "Payouts", href: "/admin/payouts" },
  { label: "Categories", href: "/admin/categories" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar title="Admin Portal" links={links} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50">{children}</main>
    </div>
  );
}
