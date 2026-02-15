"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { PageLoader } from "@/components/Spinner";

export default function InstructorProfilePage() {
  const supabase = createClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Stats
  const [courseCount, setCourseCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser(profile);
        setFullName(profile.full_name);
        setAvatarUrl(profile.avatar_url || "");
      }

      // Stats
      const [courses, enrollments] = await Promise.all([
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("instructor_id", authUser.id),
        supabase
          .from("enrollments")
          .select("amount_paid, course:courses!inner(instructor_id)")
          .eq("course.instructor_id", authUser.id),
      ]);

      setCourseCount(courses.count || 0);

      const enrollmentData = enrollments.data || [];
      setTotalStudents(enrollmentData.length);
      setTotalRevenue(
        enrollmentData.reduce(
          (sum: number, e: { amount_paid: number }) => sum + (e.amount_paid || 0),
          0
        )
      );

      setLoading(false);
    }
    load();
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast("Please select an image file (JPG, PNG, WebP)", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast("Image must be less than 2MB", "error");
      return;
    }

    setUploading(true);

    const ext = file.name.split(".").pop();
    const filePath = `avatars/${user.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast(uploadError.message, "error");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    setAvatarUrl(publicUrl);
    setUploading(false);
    toast("Avatar uploaded", "success");
  }

  function handleRemoveAvatar() {
    setAvatarUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setError("");
    setSuccess("");
    setSaving(true);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        full_name: fullName,
        avatar_url: avatarUrl || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      toast(updateError.message, "error");
    } else {
      setSuccess("Profile updated successfully!");
      toast("Profile updated", "success");
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border text-center">
          <p className="text-2xl font-bold text-gray-900">{courseCount}</p>
          <p className="text-sm text-gray-500 mt-1">Courses Created</p>
        </div>
        <div className="bg-white p-5 rounded-xl border text-center">
          <p className="text-2xl font-bold text-blue-600">{totalStudents}</p>
          <p className="text-sm text-gray-500 mt-1">Total Students</p>
        </div>
        <div className="bg-white p-5 rounded-xl border text-center">
          <p className="text-2xl font-bold text-green-600">
            {totalRevenue === 0 ? "₹0" : `₹${totalRevenue.toLocaleString()}`}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
        </div>
      </div>

      {/* Profile Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border p-6 space-y-5"
      >
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Avatar upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Profile Picture
          </label>
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary-600">
                  {fullName.charAt(0).toUpperCase()}
                </span>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : avatarUrl ? "Change Photo" : "Upload Photo"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400">JPG, PNG or WebP. Max 2MB.</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* Name & email info */}
        <div className="pt-2">
          <p className="font-semibold text-gray-900">{fullName}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">
            Email cannot be changed
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
