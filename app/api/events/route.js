import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "event";
}

async function generateUniqueEventSlug(title, eventDate) {
  const base = slugify(title);
  const dateSuffix = eventDate ? String(eventDate).replace(/-/g, "") : new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let candidate = `${base}-${dateSuffix}`;
  let attempt = 1;

  while (attempt <= 10) {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error && !error.message?.toLowerCase().includes("column \"slug\" does not exist")) {
      throw error;
    }

    if (!data) return candidate;

    candidate = `${base}-${dateSuffix}-${attempt + 1}`;
    attempt += 1;
  }

  return `${base}-${dateSuffix}-${Date.now().toString().slice(-4)}`;
}

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, title, description, location, event_date, event_time, event_end_time, capacity, image_url, category_id, difficulty, address, meeting_instructions, short_description, full_description, created_at")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) {
    if (error.message?.includes("image_url")) {
      return NextResponse.json(
        { error: "Run the latest supabase/schema.sql migration to enable event images." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: counts } = await supabaseAdmin
    .from("event_booking_counts")
    .select("event_id, booked");

  const countsMap = {};
  (counts || []).forEach((c) => {
    countsMap[c.event_id] = c.booked;
  });

  return NextResponse.json({
    events: events.map((e) => ({ ...e, booked: countsMap[e.id] || 0 })),
  });
}

export async function POST(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.formData().catch(() => new FormData());
  const title = (body.get("title") || "").trim();
  const description = (body.get("description") || "").trim();
  const short_description = (body.get("short_description") || "").trim();
  const full_description = (body.get("full_description") || "").trim();
  const location = (body.get("location") || "").trim();
  const address = (body.get("address") || "").trim();
  const meeting_instructions = (body.get("meeting_instructions") || "").trim();
  const category_id = body.get("category_id") || null;
  const difficulty = (body.get("difficulty") || "All Levels").trim();
  const event_date = body.get("event_date");
  const event_time = body.get("event_time");
  const event_end_time = body.get("event_end_time") || null;
  const capacity = parseInt(body.get("capacity"), 10);
  const image = body.get("image");
  const base_price_raw = body.get("base_price");
  const extra_activities_raw = body.get("extra_activities") || "[]";

  let slug = "";
  try {
    slug = await generateUniqueEventSlug(title, event_date);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not generate event slug." }, { status: 500 });
  }

  let base_price = 0;
  if (base_price_raw !== null && base_price_raw !== undefined && base_price_raw !== "") {
    base_price = Number.parseFloat(base_price_raw);
    if (!Number.isFinite(base_price) || base_price < 0) {
      return NextResponse.json({ error: "Event price must be zero or greater." }, { status: 400 });
    }
  }

  let extra_activities = [];
  try {
    const parsed = JSON.parse(extra_activities_raw);
    if (Array.isArray(parsed)) {
      extra_activities = parsed
        .map((activity) => {
          const name = String(activity?.name || "").trim();
          const price = Number.parseFloat(activity?.price ?? 0);

          if (!name && Number.isNaN(price)) return null;
          if (!name) {
            throw new Error("Each activity needs a name.");
          }
          if (!Number.isFinite(price) || price < 0) {
            throw new Error("Each activity price must be zero or greater.");
          }

          return { name, price: Number(price.toFixed(2)) };
        })
        .filter(Boolean);
    }
  } catch {
    return NextResponse.json({ error: "Extra activities must be valid items with a name and price." }, { status: 400 });
  }

  if (image && image.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Event images must be 5 MB or smaller." }, { status: 400 });
  }

  if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    return NextResponse.json({ error: "Event images must be JPG, PNG, or WebP files." }, { status: 400 });
  }

  if (!title || !event_date || !event_time || !capacity || capacity < 1) {
    return NextResponse.json(
      { error: "Title, date, time, and a capacity of at least 1 are required." },
      { status: 400 }
    );
  }

  let image_url = null;
  if (image && image.size > 0) {
    const storage = supabaseAdmin.storage;
    const { data: buckets, error: bucketsError } = await storage.listBuckets();

    if (bucketsError) {
      return NextResponse.json({ error: "Could not check event image storage." }, { status: 500 });
    }

    if (!(buckets || []).some((bucket) => bucket.name === "event-images")) {
      const { error: createBucketError } = await storage.createBucket("event-images", {
        public: true,
        fileSizeLimit: "5MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });

      if (createBucketError && !createBucketError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: "Could not create event image storage." }, { status: 500 });
      }
    }

    const filePath = `${crypto.randomUUID()}.${image.type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error: uploadError } = await storage
      .from("event-images")
      .upload(filePath, Buffer.from(await image.arrayBuffer()), {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Could not upload the event image." }, { status: 500 });
    }
    image_url = storage.from("event-images").getPublicUrl(filePath).data.publicUrl;
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      title,
      description: description || null,
      location: location || null,
      event_date,
      event_time,
      event_end_time,
      capacity,
      image_url,
      category_id,
      difficulty,
      address: address || null,
      meeting_instructions: meeting_instructions || null,
      short_description: short_description || null,
      full_description: full_description || description || null,
      slug,
      base_price: Number(base_price.toFixed(2)),
      extra_activities,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}
