"use client";

import { useEffect, useRef, useState } from "react";

export interface PromptDialogProps {
  open: boolean;
  title: string;
  message: string;
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  variant?: "default" | "danger" | "warning";
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export default function PromptDialog({
  open,
  title,
  message,
  placeholder = "",
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  required = false,
  variant = "default",
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submitColors =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : variant === "warning"
      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
      : "bg-primary-600 hover:bg-primary-700 text-white";

  const iconColor =
    variant === "danger"
      ? "text-red-600"
      : variant === "warning"
      ? "text-yellow-500"
      : "text-primary-600";

  const iconBg =
    variant === "danger"
      ? "bg-red-100"
      : variant === "warning"
      ? "bg-yellow-100"
      : "bg-primary-100";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (required && !value.trim()) return;
    onSubmit(value.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex gap-4 mb-4">
          {/* Icon */}
          <div className={`shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
            <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none mb-4"
          />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={required && !value.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${submitColors}`}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
