import Sidebar from "@/components/Sidebar";

const links = [
  { label: "Dashboard", href: "/instructor" },
  { label: "My Courses", href: "/instructor/courses" },
];

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar title="Instructor Portal" links={links} />
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
