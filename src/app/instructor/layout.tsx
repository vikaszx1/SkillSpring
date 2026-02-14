import Sidebar from "@/components/Sidebar";

const links = [
  { label: "Dashboard", href: "/instructor" },
  { label: "My Courses", href: "/instructor/courses" },
  { label: "Earnings", href: "/instructor/earnings" },
  { label: "Payout Settings", href: "/instructor/payout-settings" },
  { label: "Profile", href: "/instructor/profile" },
];

export default function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar title="Instructor Portal" links={links} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gray-50">{children}</main>
    </div>
  );
}
