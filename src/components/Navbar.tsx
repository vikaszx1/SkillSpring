"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", authUser.id)
          .single();
        setUser(profile);
      }
    }
    checkUser();
  }, []);

  const dashboardHref = user
    ? user.role === "admin"
      ? "/admin"
      : user.role === "instructor"
      ? "/instructor"
      : "/student"
    : null;

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Skill<span className="text-primary-600">Spring</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-primary-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                href={dashboardHref!}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm transition-colors"
              >
                Dashboard
              </Link>
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
        <div className="md:hidden border-t bg-white px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block text-sm font-medium py-2 ${
                pathname === link.href ? "text-primary-600" : "text-gray-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t flex flex-col gap-2">
            {user ? (
              <Link
                href={dashboardHref!}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-center font-medium text-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 font-medium text-sm py-2">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-center font-medium text-sm"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
