"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { PayoutRequest } from "@/lib/types";
import { useToast } from "@/components/Toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import PromptDialog from "@/components/PromptDialog";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [filter, setFilter] = useState<"pending" | "paid" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { toast } = useToast();

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "danger" | "warning";
    onConfirm: () => void;
  }>({ title: "", message: "", confirmLabel: "", variant: "danger", onConfirm: () => {} });

  // Prompt dialog
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<{
    title: string;
    message: string;
    placeholder: string;
    submitLabel: string;
    variant: "default" | "danger" | "warning";
    required: boolean;
    onSubmit: (value: string) => void;
  }>({ title: "", message: "", placeholder: "", submitLabel: "", variant: "default", required: false, onSubmit: () => {} });

  useEffect(() => {
    loadPayouts();
  }, [filter]);

  async function loadPayouts() {
    setLoading(true);
    let query = supabase
      .from("payout_requests")
      .select("*, instructor:users!instructor_id(full_name, email)")
      .order("requested_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setPayouts(data || []);
    setLoading(false);
  }

  async function handleUpdateStatus(
    payoutId: string,
    status: "paid" | "rejected",
    note?: string
  ) {
    const { error } = await supabase
      .from("payout_requests")
      .update({
        status,
        admin_note: note || null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", payoutId);

    if (!error) {
      toast(
        status === "paid" ? "Payout marked as paid" : "Payout request rejected",
        status === "paid" ? "success" : "warning"
      );
      loadPayouts();
    } else {
      toast("Failed to update payout", "error");
    }
  }

  function handleMarkPaid(payoutId: string) {
    setPromptConfig({
      title: "Mark as Paid",
      message: "Add a note (optional, e.g. transaction reference).",
      placeholder: "e.g. TXN123456789",
      submitLabel: "Mark as Paid",
      variant: "default",
      required: false,
      onSubmit: (note) => {
        setPromptOpen(false);
        handleUpdateStatus(payoutId, "paid", note || undefined);
      },
    });
    setPromptOpen(true);
  }

  function handleReject(payoutId: string) {
    setPromptConfig({
      title: "Reject Payout",
      message: "Enter a reason for rejecting this payout request.",
      placeholder: "e.g. Insufficient earnings balance...",
      submitLabel: "Reject Payout",
      variant: "danger",
      required: false,
      onSubmit: (note) => {
        setPromptOpen(false);
        handleUpdateStatus(payoutId, "rejected", note || undefined);
      },
    });
    setPromptOpen(true);
  }

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <PromptDialog
        open={promptOpen}
        title={promptConfig.title}
        message={promptConfig.message}
        placeholder={promptConfig.placeholder}
        submitLabel={promptConfig.submitLabel}
        variant={promptConfig.variant}
        required={promptConfig.required}
        onSubmit={promptConfig.onSubmit}
        onCancel={() => setPromptOpen(false)}
      />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payout Requests</h1>
        {filter === "pending" && payouts.length > 0 && (
          <div className="text-sm text-gray-500">
            Total pending:{" "}
            <span className="font-semibold text-yellow-600">
              ₹{totalPending.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "paid", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === f
                ? f === "pending"
                  ? "bg-yellow-100 text-yellow-700"
                  : f === "paid"
                  ? "bg-green-100 text-green-700"
                  : f === "rejected"
                  ? "bg-red-100 text-red-700"
                  : "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : payouts.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          {filter === "pending"
            ? "No pending payout requests."
            : `No ${filter === "all" ? "" : filter + " "}payout requests.`}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Instructor</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Payment Method</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Requested</th>
                <th className="px-6 py-3">Note</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {p.instructor?.full_name || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.instructor?.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {p.payment_method_type ? (
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            p.payment_method_type === "upi"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {p.payment_method_type === "upi" ? "UPI" : "Bank"}
                        </span>
                        <p className="text-xs text-gray-700 mt-1 font-mono">
                          {p.payment_details}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Not provided</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : p.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(p.requested_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                    {p.admin_note || "—"}
                  </td>
                  <td className="px-6 py-4">
                    {p.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium text-xs"
                        >
                          Mark as Paid
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
