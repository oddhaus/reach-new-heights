import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export async function GET() {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("categories").select("id, name").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data || [] });
}

export async function POST(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { name = "" } = await request.json().catch(() => ({}));
  const cleanName = name.trim();
  if (!cleanName) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("categories").insert({ name: cleanName }).select("id, name").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That category already exists." : error.message }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function PATCH(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id, name = "" } = await request.json().catch(() => ({}));
  const cleanName = name.trim();
  if (!id || !cleanName) return NextResponse.json({ error: "Category and name are required." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("categories").update({ name: cleanName }).eq("id", id).select("id, name").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That category already exists." : error.message }, { status: 400 });
  return NextResponse.json({ category: data });
}

export async function DELETE(request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Category is required." }, { status: 400 });
  const { error } = await supabaseAdmin.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}