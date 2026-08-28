"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CategoryManager({ categories }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");

  async function request(method, body) {
    setError("");
    const response = await fetch("/api/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update categories.");
    router.refresh();
  }

  async function addCategory(event) {
    event.preventDefault();
    try { await request("POST", { name }); setName(""); } catch (error) { setError(error.message); }
  }

  async function saveCategory(id) {
    try { await request("PATCH", { id, name: editingName }); setEditingId(null); } catch (error) { setError(error.message); }
  }

  async function deleteCategory(id) {
    if (!confirm("Delete this category? Existing events will keep their details.")) return;
    try { await request("DELETE", { id }); } catch (error) { setError(error.message); }
  }

  return (
    <section className="category-manager form-card">
      <div className="category-manager-heading">
        <div>
          <p className="section-kicker">Event setup</p>
          <h2>Categories</h2>
        </div>
        <span>{categories.length} active</span>
      </div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form className="category-add-form" onSubmit={addCategory}>
        <input aria-label="New category name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Add a category" />
        <button className="btn btn-primary" type="submit">Add category</button>
      </form>
      <ul className="category-list">
        {categories.map((category) => (
          <li key={category.id}>
            {editingId === category.id ? (
              <input value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Edit ${category.name}`} />
            ) : <span>{category.name}</span>}
            <div className="category-actions">
              {editingId === category.id ? (
                <button type="button" className="text-button" onClick={() => saveCategory(category.id)}>Save</button>
              ) : (
                <button type="button" className="text-button" onClick={() => { setEditingId(category.id); setEditingName(category.name); }}>Edit</button>
              )}
              <button type="button" className="text-button danger" onClick={() => deleteCategory(category.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}