import Sidebar from "@/components/Sidebar";

const links = [
  { label: "Dashboard", href: "/admin" },
  { label: "Course Approvals", href: "/admin/courses" },
  { label: "Categories", href: "/admin/categories" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar title="Admin Portal" links={links} />
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
