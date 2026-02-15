"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Course, Category } from "@/lib/types";
import Footer from "@/components/Footer";
import CourseCard from "@/components/CourseCard";

type SortOption = "newest" | "price-low" | "price-high" | "popular";

export default function CoursesMarketplace() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviewMap, setReviewMap] = useState<
    Record<string, { avg: number; count: number }>
  >({});
  const [lessonMap, setLessonMap] = useState<Record<string, number>>({});
  const [enrollmentCounts, setEnrollmentCounts] = useState<
    Record<string, number>
  >({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortOption>("newest");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">(
    "all"
  );
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [levelFilter, setLevelFilter] = useState<string>("");
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => {
    async function load() {
      // Courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select(
          "*, instructor:users!instructor_id(full_name), category:categories(name, slug)"
        )
        .eq("is_approved", true)
        .eq("is_published", true)
        .eq("is_flagged", false)
        .order("created_at", { ascending: false });

      const allCourses = coursesData || [];
      setCourses(allCourses);

      // Categories
      const { data: catData } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      setCategories(catData || []);

      if (allCourses.length > 0) {
        const courseIds = allCourses.map((c) => c.id);

        // Reviews
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
          lMap[s.course_id] = (lMap[s.course_id] || 0) + (s.lessons?.length || 0);
        });
        setLessonMap(lMap);

        // Enrollment counts
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("course_id")
          .in("course_id", courseIds);

        const eMap: Record<string, number> = {};
        (enrollData || []).forEach((e) => {
          eMap[e.course_id] = (eMap[e.course_id] || 0) + 1;
        });
        setEnrollmentCounts(eMap);
      }

      setLoading(false);
    }
    load();
  }, []);

  // Filter & sort
  const filtered = courses
    .filter((c) => {
      const matchesSearch =
        !search ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor?.full_name?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        (c.category as Category & { slug?: string })?.slug === selectedCategory;

      const matchesPrice =
        priceFilter === "all" ||
        (priceFilter === "free" && c.price === 0) ||
        (priceFilter === "paid" && c.price > 0);

      const matchesRating =
        ratingFilter === 0 ||
        (reviewMap[c.id] && reviewMap[c.id].avg >= ratingFilter);

      const matchesLevel =
        !levelFilter || c.level === levelFilter;

      return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesLevel;
    })
    .sort((a, b) => {
      switch (sort) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "popular":
          return (enrollmentCounts[b.id] || 0) - (enrollmentCounts[a.id] || 0);
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
      }
    });

  function clearFilters() {
    setSearch("");
    setSelectedCategory("");
    setPriceFilter("all");
    setRatingFilter(0);
    setLevelFilter("");
    setSort("newest");
  }

  const hasActiveFilters =
    search || selectedCategory || priceFilter !== "all" || sort !== "newest" || ratingFilter > 0 || levelFilter;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Courses</h1>
          <p className="mt-2 text-gray-500">
            {filtered.length} course{filtered.length !== 1 ? "s" : ""} available
          </p>

          {/* Search bar */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, description, or instructor..."
                className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-gray-50 focus:bg-white transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setMobileSidebar(!mobileSidebar)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar filters */}
            <aside
              className={`${
                mobileSidebar ? "block" : "hidden"
              } lg:block w-full lg:w-64 flex-shrink-0`}
            >
              <div className="bg-white rounded-xl border p-5 space-y-6 sticky top-24">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort by
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="newest">Newest First</option>
                    <option value="popular">Most Popular</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "all" as const, label: "All" },
                      { value: "free" as const, label: "Free" },
                      { value: "paid" as const, label: "Paid" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="price"
                          checked={priceFilter === option.value}
                          onChange={() => setPriceFilter(option.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 0, label: "All Ratings" },
                      { value: 4.5, label: "4.5 & up" },
                      { value: 4, label: "4.0 & up" },
                      { value: 3, label: "3.0 & up" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="rating"
                          checked={ratingFilter === option.value}
                          onChange={() => setRatingFilter(option.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 flex items-center gap-1">
                          {option.value > 0 && (
                            <span className="flex">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <svg
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= Math.floor(option.value)
                                      ? "text-yellow-400"
                                      : "text-gray-200"
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </span>
                          )}
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: "", label: "All Levels" },
                      { value: "beginner", label: "Beginner" },
                      { value: "intermediate", label: "Intermediate" },
                      { value: "advanced", label: "Advanced" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="level"
                          checked={levelFilter === option.value}
                          onChange={() => setLevelFilter(option.value)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          checked={selectedCategory === ""}
                          onChange={() => setSelectedCategory("")}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          All Categories
                        </span>
                      </label>
                      {categories.map((cat) => (
                        <label
                          key={cat.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="category"
                            checked={selectedCategory === cat.slug}
                            onChange={() => setSelectedCategory(cat.slug)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">
                            {cat.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Course Grid */}
            <div className="flex-1 min-w-0">
              {/* Active filters tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {search && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                      &quot;{search}&quot;
                      <button onClick={() => setSearch("")}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                      {categories.find((c) => c.slug === selectedCategory)?.name}
                      <button onClick={() => setSelectedCategory("")}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {priceFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                      {priceFilter === "free" ? "Free" : "Paid"}
                      <button onClick={() => setPriceFilter("all")}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {ratingFilter > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                      {ratingFilter}+ stars
                      <button onClick={() => setRatingFilter(0)}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {levelFilter && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                      {levelFilter.charAt(0).toUpperCase() + levelFilter.slice(1)}
                      <button onClick={() => setLevelFilter("")}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border overflow-hidden animate-pulse"
                    >
                      <div className="aspect-video bg-gray-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <svg
                    className="w-16 h-16 text-gray-300 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">
                    No courses found
                  </h3>
                  <p className="mt-2 text-gray-500 text-sm">
                    Try adjusting your filters or search terms
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      reviewData={reviewMap[course.id]}
                      lessonCount={lessonMap[course.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
