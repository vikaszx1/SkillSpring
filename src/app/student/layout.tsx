import Sidebar from "@/components/Sidebar";

const links = [
  { label: "Dashboard", href: "/student" },
  { label: "Browse Courses", href: "/courses" },
  { label: "My Enrollments", href: "/student/enrollments" },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar title="Student Portal" links={links} />
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
