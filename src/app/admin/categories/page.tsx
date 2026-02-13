"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(data || []);
    setLoading(false);
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newName.trim()) return;

    const slug = generateSlug(newName);

    const { error: insertError } = await supabase.from("categories").insert({
      name: newName.trim(),
      slug,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewName("");
    loadCategories();
  }

  async function handleDelete(id: string) {
    await supabase.from("categories").delete().eq("id", id);
    loadCategories();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Category Management
      </h1>

      {/* Add Category */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-xl border p-6 mb-8"
      >
        <h2 className="font-semibold text-gray-900 mb-4">Add Category</h2>
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          />
          <button
            type="submit"
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Add
          </button>
        </div>
      </form>

      {/* Categories List */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          No categories yet. Add one above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{category.name}</p>
                <p className="text-sm text-gray-400">{category.slug}</p>
              </div>
              <button
                onClick={() => handleDelete(category.id)}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
