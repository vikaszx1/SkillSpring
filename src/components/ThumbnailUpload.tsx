"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";

interface ThumbnailUploadProps {
  currentUrl: string;
  onUploaded: (url: string) => void;
}

export default function ThumbnailUpload({
  currentUrl,
  onUploaded,
}: ThumbnailUploadProps) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, WebP, etc.)");
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError("");
    setUploading(true);

    // Create a unique file path
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `thumbnails/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("course-thumbnails")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("course-thumbnails").getPublicUrl(filePath);

    setPreview(publicUrl);
    onUploaded(publicUrl);
    setUploading(false);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Thumbnail
      </label>

      {/* Preview */}
      {preview ? (
        <div className="mb-3 relative w-full aspect-video rounded-lg overflow-hidden border bg-gray-100">
          <img
            src={preview}
            alt="Thumbnail preview"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPreview("");
              onUploaded("");
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-black/80"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="mb-3 w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          <svg
            className="w-10 h-10 text-gray-400 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-gray-500">Click to upload thumbnail</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP up to 5MB</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm text-primary-600 hover:underline disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Choose file"}
        </button>
      )}

      {preview && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm text-primary-600 hover:underline disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Change image"}
        </button>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
