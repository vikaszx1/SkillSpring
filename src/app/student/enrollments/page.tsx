"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Enrollment } from "@/lib/types";
import Link from "next/link";

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("enrollments")
        .select("*, course:courses(id, title, slug, thumbnail_url, price)")
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false });

      setEnrollments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Enrollments</h1>

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500 mb-4">No enrollments yet.</p>
          <Link
            href="/courses"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {enrollment.course?.title}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}{" "}
                  · Paid &#8377;{enrollment.amount_paid}
                </p>
              </div>
              <Link
                href={`/student/courses/${enrollment.course_id}/learn`}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm text-center sm:flex-shrink-0"
              >
                Learn
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
