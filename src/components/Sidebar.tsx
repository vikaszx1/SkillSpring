"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface SidebarLink {
  label: string;
  href: string;
}

interface SidebarProps {
  title: string;
  links: SidebarLink[];
}

export default function Sidebar({ title, links }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <Link href="/" className="text-xl font-bold text-primary-600">
          SkillSpring
        </Link>
        <p className="text-xs text-gray-500 mt-1">{title}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg text-left font-medium"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
