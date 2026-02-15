"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { User, UserRole } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/Spinner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", role: "student" as UserRole });
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  async function loadUsers() {
    setLoading(true);
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }

    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  }

  function openEdit(user: User) {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role,
    });
  }

  async function handleEditSave() {
    if (!editUser) return;
    setSaving(true);

    const { error } = await supabase
      .from("users")
      .update({
        full_name: editForm.full_name,
        email: editForm.email,
        role: editForm.role,
      })
      .eq("id", editUser.id);

    setSaving(false);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? { ...u, full_name: editForm.full_name, email: editForm.email, role: editForm.role }
            : u
        )
      );
      toast("User updated successfully", "success");
      setEditUser(null);
    } else {
      toast("Failed to update user", "error");
    }
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setDeleting(true);

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", deleteUser.id);

    setDeleting(false);

    if (!error) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast("User deleted successfully", "success");
      setDeleteUser(null);
    } else {
      toast("Failed to delete user. They may have related data (enrollments, courses, etc.)", "error");
    }
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    instructor: users.filter((u) => u.role === "instructor").length,
    student: users.filter((u) => u.role === "student").length,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">User Management</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {(["all", "admin", "instructor", "student"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                roleFilter === role
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}{" "}
              <span className="text-xs opacity-70">({roleCounts[role]})</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          No users found.
        </div>
      ) : (
        <>
        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold">
                          {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 text-sm">
                        {user.full_name || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : user.role === "instructor"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      {user.role !== "admin" && (
                        <button
                          onClick={() => setDeleteUser(user)}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center gap-3 mb-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold">
                    {user.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{user.full_name || "—"}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : user.role === "instructor"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Joined {formatDate(user.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  {user.role !== "admin" && (
                    <button
                      onClick={() => setDeleteUser(user)}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
              <button
                onClick={() => setEditUser(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete User</h3>
              <p className="text-sm text-gray-500 text-center">
                Are you sure you want to delete <span className="font-medium text-gray-700">{deleteUser.full_name || deleteUser.email}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
