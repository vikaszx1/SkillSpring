"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import type { Course, CourseSection, CourseLesson, Review } from "@/lib/types";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RazorpayButton from "@/components/RazorpayButton";
import VideoPlayer from "@/components/VideoPlayer";
import { useToast } from "@/components/Toast";

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [previewLesson, setPreviewLesson] = useState<CourseLesson | null>(null);
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
        .eq("is_flagged", false)
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
      toast("Enrolled successfully!", "success");
      setEnrolled(true);
      router.push(`/student/courses/${course.id}/learn`);
    } else {
      toast(error.message, "error");
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
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          <div className="lg:col-span-2 flex flex-col justify-center">
            {course.category && (
              <span className="inline-block w-fit px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-xs font-medium mb-4 backdrop-blur-sm border border-primary-500/20">
                {course.category.name}
              </span>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight">{course.title}</h1>
            <p className="mt-4 text-gray-300 text-lg line-clamp-3">{course.description}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2 text-gray-300">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {course.instructor?.full_name}
              </span>
              {avgRating && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  {avgRating} ({reviews.length} reviews)
                </span>
              )}
              <span className="flex items-center gap-1 text-gray-300">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {totalLessons} lessons
              </span>
              <span className="flex items-center gap-1 text-gray-300">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                {sections.length} sections
              </span>
            </div>
          </div>

          {/* Buy Card */}
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden transition-transform hover:scale-[1.02] duration-300">
            {/* Thumbnail */}
            {course.thumbnail_url ? (
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center">
                <svg className="w-16 h-16 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            )}
            <div className="p-5">
              <p className="text-3xl font-bold">
                {course.price === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <span>&#8377;{course.price}</span>
                )}
              </p>
              <div className="mt-4">
                {enrolled ? (
                  <Link
                    href={`/student/courses/${course.id}/learn`}
                    className="block text-center bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-green-600/25"
                  >
                    Continue Learning
                  </Link>
                ) : course.price === 0 ? (
                  <button
                    onClick={handleFreeEnroll}
                    className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/25"
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
                    className="block text-center bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-primary-600/25"
                  >
                    Log in to Buy
                  </Link>
                )}
              </div>
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {totalLessons} lessons across {sections.length} sections
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Full lifetime access
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  Certificate of completion
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* About this course */}
            {course.description && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About this course</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{course.description}</p>
              </div>
            )}

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
                          className={`px-3 py-2 text-sm text-gray-600 flex items-center justify-between ${
                            lesson.is_preview && lesson.video_url
                              ? "cursor-pointer hover:bg-primary-50"
                              : ""
                          }`}
                          onClick={() => {
                            if (lesson.is_preview && lesson.video_url) {
                              setPreviewLesson(lesson);
                            }
                          }}
                        >
                          <span className="flex items-center gap-2">
                            {lesson.is_preview && lesson.video_url && (
                              <svg
                                className="w-4 h-4 text-primary-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {lesson.title}
                          </span>
                          {lesson.is_preview && (
                            <span className="text-xs text-primary-600 font-medium">
                              {lesson.video_url ? "Preview" : "Preview"}
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

      {/* Preview Modal */}
      {previewLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setPreviewLesson(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden w-full max-w-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                Preview: {previewLesson.title}
              </h3>
              <button
                onClick={() => setPreviewLesson(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <VideoPlayer
              url={previewLesson.video_url}
              title={previewLesson.title}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
