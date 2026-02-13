"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCourses: 0,
    pendingApproval: 0,
    totalUsers: 0,
    totalCategories: 0,
  });
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [courses, pending, users, categories] = await Promise.all([
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("is_approved", false),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalCourses: courses.count || 0,
        pendingApproval: pending.count || 0,
        totalUsers: users.count || 0,
        totalCategories: categories.count || 0,
      });
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Total Courses</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats.totalCourses}
          </p>
        </div>
        <Link
          href="/admin/courses"
          className="bg-white p-6 rounded-xl border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {stats.pendingApproval}
          </p>
        </Link>
        <div className="bg-white p-6 rounded-xl border">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {stats.totalUsers}
          </p>
        </div>
        <Link
          href="/admin/categories"
          className="bg-white p-6 rounded-xl border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-500">Categories</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">
            {stats.totalCategories}
          </p>
        </Link>
      </div>
    </div>
  );
}
