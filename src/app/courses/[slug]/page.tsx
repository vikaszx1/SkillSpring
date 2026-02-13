"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import type { Course, CourseSection, Review } from "@/lib/types";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RazorpayButton from "@/components/RazorpayButton";

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Get course
      const { data: courseData } = await supabase
        .from("courses")
        .select(
          "*, instructor:users!instructor_id(full_name, avatar_url), category:categories(name)"
        )
        .eq("slug", slug)
        .eq("is_approved", true)
        .eq("is_published", true)
        .single();

      if (!courseData) {
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // Get sections with lessons
      const { data: sectionsData } = await supabase
        .from("course_sections")
        .select("*, lessons:course_lessons(*)")
        .eq("course_id", courseData.id)
        .order("position");

      setSections(
        (sectionsData || []).map((s) => ({
          ...s,
          lessons: (s.lessons || []).sort(
            (a: { position: number }, b: { position: number }) =>
              a.position - b.position
          ),
        }))
      );

      // Get reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("*, user:users(full_name)")
        .eq("course_id", courseData.id)
        .order("created_at", { ascending: false });

      setReviews(reviewsData || []);

      // Check enrollment
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email || "");

        const { data: profile } = await supabase
          .from("users")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setUserName(profile?.full_name || "");

        const { data: enrollment } = await supabase
          .from("enrollments")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseData.id)
          .single();

        setEnrolled(!!enrollment);
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleFreeEnroll() {
    if (!userId || !course) {
      router.push("/login");
      return;
    }

    const { error } = await supabase.from("enrollments").insert({
      user_id: userId,
      course_id: course.id,
      amount_paid: 0,
    });
    if (!error) {
      setEnrolled(true);
      router.push(`/student/courses/${course.id}/learn`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Course not found.
      </div>
    );
  }

  const totalLessons = sections.reduce(
    (acc, s) => acc + (s.lessons?.length || 0),
    0
  );

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="mt-4 text-gray-300 text-lg">{course.description}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <span>By {course.instructor?.full_name}</span>
              {course.category && <span>{course.category.name}</span>}
              {avgRating && <span>{avgRating} rating</span>}
              <span>{totalLessons} lessons</span>
            </div>
          </div>
          <div className="bg-white text-gray-900 rounded-xl p-6 shadow-lg">
            <p className="text-3xl font-bold">
              {course.price === 0 ? "Free" : `₹${course.price}`}
            </p>
            <div className="mt-4">
              {enrolled ? (
                <Link
                  href={`/student/courses/${course.id}/learn`}
                  className="block text-center bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  Continue Learning
                </Link>
              ) : course.price === 0 ? (
                <button
                  onClick={handleFreeEnroll}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-semibold"
                >
                  Enroll for Free
                </button>
              ) : userId ? (
                <RazorpayButton
                  courseId={course.id}
                  courseName={course.title}
                  price={course.price}
                  userEmail={userEmail}
                  userName={userName}
                  onSuccess={() => setEnrolled(true)}
                />
              ) : (
                <Link
                  href="/login"
                  className="block text-center bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 font-semibold"
                >
                  Log in to Buy
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Course Content */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Course Content
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {sections.length} sections · {totalLessons} lessons
              </p>
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <details key={section.id} className="border rounded-lg">
                    <summary className="p-3 cursor-pointer font-medium text-gray-900 text-sm hover:bg-gray-50">
                      Section {idx + 1}: {section.title}
                      <span className="text-gray-400 ml-2">
                        ({section.lessons?.length || 0} lessons)
                      </span>
                    </summary>
                    <div className="border-t divide-y">
                      {section.lessons?.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="px-3 py-2 text-sm text-gray-600 flex items-center justify-between"
                        >
                          <span>{lesson.title}</span>
                          {lesson.is_preview && (
                            <span className="text-xs text-primary-600">
                              Preview
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Reviews {avgRating && `(${avgRating})`}
              </h2>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {review.user?.full_name}
                        </span>
                        <span className="text-yellow-500 text-sm">
                          {"★".repeat(review.rating)}
                          {"☆".repeat(5 - review.rating)}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-1 text-sm text-gray-600">
                          {review.comment}
                        </p>
                      )}
                    </div>
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
