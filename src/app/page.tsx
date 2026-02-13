"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Course, Category } from "@/lib/types";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";

export default function Home() {
  const supabase = createClient();
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviewMap, setReviewMap] = useState<
    Record<string, { avg: number; count: number }>
  >({});
  const [lessonMap, setLessonMap] = useState<Record<string, number>>({});

  useEffect(() => {
    async function load() {
      // Featured courses (latest approved + published)
      const { data: coursesData } = await supabase
        .from("courses")
        .select(
          "*, instructor:users!instructor_id(full_name), category:categories(name)"
        )
        .eq("is_approved", true)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6);

      const courses = coursesData || [];
      setFeaturedCourses(courses);

      // Categories
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      setCategories(catData || []);

      // Reviews aggregate for featured courses
      if (courses.length > 0) {
        const courseIds = courses.map((c) => c.id);

        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("course_id, rating")
          .in("course_id", courseIds);

        const rMap: Record<string, { sum: number; count: number }> = {};
        (reviewsData || []).forEach((r) => {
          if (!rMap[r.course_id]) rMap[r.course_id] = { sum: 0, count: 0 };
          rMap[r.course_id].sum += r.rating;
          rMap[r.course_id].count += 1;
        });

        const finalMap: Record<string, { avg: number; count: number }> = {};
        Object.entries(rMap).forEach(([id, { sum, count }]) => {
          finalMap[id] = { avg: sum / count, count };
        });
        setReviewMap(finalMap);

        // Lesson counts
        const { data: sectionsData } = await supabase
          .from("course_sections")
          .select("course_id, lessons:course_lessons(id)")
          .in("course_id", courseIds);

        const lMap: Record<string, number> = {};
        (sectionsData || []).forEach((s) => {
          const cid = s.course_id;
          lMap[cid] = (lMap[cid] || 0) + (s.lessons?.length || 0);
        });
        setLessonMap(lMap);
      }
    }
    load();
  }, []);

  const categoryIcons = [
    "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    "M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z",
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z",
    "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-white/10 text-primary-100 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-white/10">
              Join thousands of learners worldwide
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Invest in your future.{" "}
              <span className="text-primary-200">Learn without limits.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-primary-100 leading-relaxed max-w-2xl">
              Master new skills with courses from expert instructors. Whether you
              want to advance your career, pick up a new hobby, or grow your
              knowledge — start learning today.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center bg-white text-primary-700 px-7 py-3.5 rounded-xl hover:bg-primary-50 font-semibold text-lg transition-colors shadow-lg shadow-primary-900/20"
              >
                Get Started Free
                <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center border-2 border-white/30 text-white px-7 py-3.5 rounded-xl hover:bg-white/10 font-semibold text-lg transition-colors backdrop-blur-sm"
              >
                Browse Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-b bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10K+", label: "Students" },
              { value: "500+", label: "Courses" },
              { value: "100+", label: "Instructors" },
              { value: "4.8", label: "Avg. Rating" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">
                Explore Categories
              </h2>
              <p className="mt-3 text-gray-500 max-w-lg mx-auto">
                Find the perfect course in your area of interest
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((cat, i) => (
                <Link
                  key={cat.id}
                  href={`/courses?category=${cat.slug}`}
                  className="group flex flex-col items-center p-6 bg-gray-50 rounded-xl hover:bg-primary-50 hover:shadow-md transition-all duration-200 border border-transparent hover:border-primary-100"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <svg
                      className="w-6 h-6 text-primary-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={categoryIcons[i % categoryIcons.length]}
                      />
                    </svg>
                  </div>
                  <span className="mt-3 text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Courses */}
      {featuredCourses.length > 0 && (
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  Featured Courses
                </h2>
                <p className="mt-3 text-gray-500">
                  Hand-picked courses to get you started
                </p>
              </div>
              <Link
                href="/courses"
                className="hidden sm:inline-flex items-center text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors"
              >
                View all courses
                <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  reviewData={reviewMap[course.id]}
                  lessonCount={lessonMap[course.id]}
                />
              ))}
            </div>

            <div className="mt-10 text-center sm:hidden">
              <Link
                href="/courses"
                className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
              >
                View all courses
                <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">
              Getting started is easy — just three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: "01",
                title: "Create an Account",
                description:
                  "Sign up for free in seconds. Choose whether you want to learn or teach.",
                icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
              },
              {
                step: "02",
                title: "Browse & Enroll",
                description:
                  "Explore courses across categories. Enroll in free courses or purchase premium ones.",
                icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
              },
              {
                step: "03",
                title: "Learn & Grow",
                description:
                  "Watch video lessons at your own pace. Track your progress and earn completion.",
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-5">
                  <svg
                    className="w-7 h-7 text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={item.icon}
                    />
                  </svg>
                </div>
                <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">
                  Step {item.step}
                </span>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teach CTA */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 sm:p-12 lg:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Share your knowledge with the world
            </h2>
            <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
              Join our community of instructors and reach thousands of eager
              learners. Create courses, build your audience, and earn.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center bg-white text-primary-700 px-7 py-3.5 rounded-xl hover:bg-primary-50 font-semibold text-lg transition-colors shadow-lg"
            >
              Start Teaching Today
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
