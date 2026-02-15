"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";

interface UserProfile {
  role: string;
  full_name: string;
  avatar_url: string | null;
}

const commonLinks = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
];

const roleLinks: Record<string, { label: string; href: string }[]> = {
  student: [
    { label: "My Learning", href: "/student/enrollments" },
    { label: "My Reviews", href: "/student/reviews" },
  ],
  instructor: [
    { label: "My Courses", href: "/instructor/courses" },
    { label: "Earnings", href: "/instructor/earnings" },
  ],
  admin: [
    { label: "Course Approvals", href: "/admin/courses" },
    { label: "Users", href: "/admin/users" },
    { label: "Payouts", href: "/admin/payouts" },
    { label: "Categories", href: "/admin/categories" },
  ],
};

function getDashboardHref(role: string) {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/student";
}

function getDropdownItems(role: string) {
  const items: { label: string; href: string }[] = [
    { label: "Dashboard", href: getDashboardHref(role) },
  ];
  if (role === "student" || role === "instructor") {
    items.push({ label: "Profile", href: `/${role}/profile` });
  }
  if (role === "instructor") {
    items.push({ label: "Payout Settings", href: "/instructor/payout-settings" });
  }
  return items;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

const AUTH_ROUTES = ["/login", "/signup"];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Hide navbar on auth pages
  if (AUTH_ROUTES.includes(pathname)) return null;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("role, full_name, avatar_url")
          .eq("id", authUser.id)
          .single();
        if (profile) setUser(profile);
      } else {
        setUser(null);
      }
    }
    checkUser();
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setDropdownOpen(false);
    router.push("/login");
    router.refresh();
  }

  const currentRoleLinks = user ? roleLinks[user.role] || [] : [];
  const allNavLinks = [...commonLinks, ...currentRoleLinks];
  const dropdownItems = user ? getDropdownItems(user.role) : [];

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Skill<span className="text-primary-600">Spring</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6 ml-8">
            {allNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive(pathname, link.href)
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                  )}
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-1 z-50">
                    <div className="px-4 py-3 border-b">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    {dropdownItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="border-t mt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm transition-colors"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-1">
          {allNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2 px-3 rounded-lg ${
                isActive(pathname, link.href)
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t mt-3">
            {user ? (
              <>
                <div className="px-3 py-2 mb-2 flex items-center gap-3">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  </div>
                </div>
                {dropdownItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm font-medium py-2 px-3 rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="w-full text-left text-sm font-medium py-2 px-3 rounded-lg text-gray-600 hover:bg-gray-50 mt-1"
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-600 font-medium text-sm py-2 px-3"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-center font-medium text-sm"
                >
                  Sign up free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
