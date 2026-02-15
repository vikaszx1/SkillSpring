"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { PaymentMethodType, InstructorPaymentMethod } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { PageLoader } from "@/components/Spinner";

export default function PayoutSettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [methodType, setMethodType] = useState<PaymentMethodType>("upi");
  const [upiId, setUpiId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [existingMethod, setExistingMethod] =
    useState<InstructorPaymentMethod | null>(null);

  useEffect(() => {
    loadPaymentMethod();
  }, []);

  async function loadPaymentMethod() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("instructor_payment_methods")
      .select("*")
      .eq("instructor_id", user.id)
      .eq("is_default", true)
      .single();

    if (data) {
      setExistingMethod(data);
      setMethodType(data.method_type as PaymentMethodType);
      setUpiId(data.upi_id || "");
      setBankAccountNumber(data.bank_account_number || "");
      setBankIfsc(data.bank_ifsc || "");
      setBankAccountName(data.bank_account_name || "");
    }

    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (methodType === "upi" && !upiId.trim()) {
      setError("Please enter your UPI ID");
      return;
    }
    if (methodType === "bank") {
      if (!bankAccountNumber.trim() || !bankIfsc.trim() || !bankAccountName.trim()) {
        setError("Please fill in all bank account details");
        return;
      }
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      instructor_id: user.id,
      method_type: methodType,
      upi_id: methodType === "upi" ? upiId.trim() : null,
      bank_account_number: methodType === "bank" ? bankAccountNumber.trim() : null,
      bank_ifsc: methodType === "bank" ? bankIfsc.trim().toUpperCase() : null,
      bank_account_name: methodType === "bank" ? bankAccountName.trim() : null,
      is_default: true,
    };

    let saveError;

    if (existingMethod) {
      const { error: err } = await supabase
        .from("instructor_payment_methods")
        .update(payload)
        .eq("id", existingMethod.id);
      saveError = err;
    } else {
      const { error: err } = await supabase
        .from("instructor_payment_methods")
        .insert(payload);
      saveError = err;
    }

    if (saveError) {
      setError(saveError.message);
      toast(saveError.message, "error");
    } else {
      setSuccess("Payment method saved successfully!");
      toast("Payment method saved", "success");
      loadPaymentMethod();
    }

    setSaving(false);
  }

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Payout Settings</h1>

      <div className="bg-white rounded-xl border p-6">
        <p className="text-sm text-gray-500 mb-6">
          Configure how you want to receive payouts. These details will be
          shared with the admin when you request a withdrawal.
        </p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Method Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMethodType("upi")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  methodType === "upi"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">UPI</div>
                <div className="text-xs mt-0.5 opacity-70">
                  GPay, PhonePe, Paytm, etc.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMethodType("bank")}
                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                  methodType === "bank"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">Bank Transfer</div>
                <div className="text-xs mt-0.5 opacity-70">
                  NEFT / IMPS / RTGS
                </div>
              </button>
            </div>
          </div>

          {/* UPI Fields */}
          {methodType === "upi" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okicici"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                e.g. name@upi, name@okicici, 9876543210@paytm
              </p>
            </div>
          )}

          {/* Bank Fields */}
          {methodType === "bank" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="1234567890123"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  placeholder="SBIN0001234"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm">{success}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : existingMethod ? "Update Payment Method" : "Save Payment Method"}
          </button>
        </form>

        {/* Current Method Display */}
        {existingMethod && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Current Saved Method
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              {existingMethod.method_type === "upi" ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    UPI
                  </span>
                  <span className="text-gray-900 font-medium">
                    {existingMethod.upi_id}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    Bank Transfer
                  </span>
                  <div className="text-gray-900 mt-1">
                    <p>
                      <span className="text-gray-500">Name:</span>{" "}
                      {existingMethod.bank_account_name}
                    </p>
                    <p>
                      <span className="text-gray-500">A/C:</span>{" "}
                      {existingMethod.bank_account_number}
                    </p>
                    <p>
                      <span className="text-gray-500">IFSC:</span>{" "}
                      {existingMethod.bank_ifsc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
