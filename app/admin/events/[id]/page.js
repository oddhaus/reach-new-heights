import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatEventDate, formatEventTime, formatCurrency } from "@/lib/format";
import TopBar from "@/components/TopBar";
import DeleteEventButton from "@/components/DeleteEventButton";
import ShareLinkButton from "@/components/ShareLinkButton";
import CreateEventForm from "@/components/CreateEventForm";
import RegistrantDetailsModal from "@/components/RegistrantDetailsModal";

export const revalidate = 0;

export default async function AdminEventPage({ params }) {
  if (!(await isAdminRequest())) {
    redirect("/admin/login");
  }

  const { id } = await params;

  let { data: event, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    const slugMatch = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("slug", id)
      .maybeSingle();

    event = slugMatch.data;
    error = slugMatch.error;
  }

  if (error && (error.message?.includes("slug") || error.message?.includes("column \"slug\""))) {
    const fallback = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fallback.data) {
      event = fallback.data;
      error = null;
    }
  }

  if (!event) notFound();

  const eventId = event?.id || id;

  let bookingsResult = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (bookingsResult.error && /column .* does not exist|column.* not found|could not find the column/i.test(bookingsResult.error.message || "")) {
    bookingsResult = await supabaseAdmin
      .from("bookings")
      .select("id, name, phone, email, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
  }

  const bookings = bookingsResult.data || [];

  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .order("name");

  const list = bookings || [];
  const extraActivities = Array.isArray(event.extra_activities) ? event.extra_activities : [];

  return (
    <>
      <TopBar tag="Admin dashboard" isAdmin />
      <main className="container admin-surface">
        <div className="event-detail-nav">
          <Link href="/admin" className="back-link">
            &larr; All events
          </Link>
          <span className="event-date-chip">
            {formatEventDate(event.event_date)} &middot; {formatEventTime(event.event_time)}
          </span>
        </div>
        <h1 className="hero-heading">{event.title}</h1>
        <p className="hero-sub">
          {event.location} &middot; {list.length} / {event.capacity} booked &middot; {event.base_price ? formatCurrency(event.base_price) : "Free"}
        </p>

        <div className="btn-row" style={{ marginBottom: 24 }}>
          <ShareLinkButton eventId={event.id} eventSlug={event.slug} title={event.title} />
          <DeleteEventButton eventId={event.id} />
        </div>

        <div className="form-card pricing-panel" style={{ marginBottom: 24 }}>
          <p className="section-kicker">Pricing</p>
          <p className="pricing-main" style={{ marginTop: 8, marginBottom: 0 }}>
            <strong>Main event:</strong> {event.base_price ? formatCurrency(event.base_price) : "Free"}
          </p>
          {extraActivities.length > 0 ? (
            <ul className="pricing-list" style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {extraActivities.map((activity, index) => (
                <li key={`${activity.name}-${index}`}>
                  {activity.name}: {formatCurrency(activity.price || 0)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="helper-text" style={{ marginBottom: 0 }}>No add-on activities configured.</p>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          <CreateEventForm categories={categories || []} existingEvent={event} mode="edit" />
        </div>

        <h2 className="section-heading" style={{ marginTop: 0 }}>
          Registrants
        </h2>

        {list.length === 0 ? (
          <div className="empty-state">No bookings yet.</div>
        ) : (
          <RegistrantDetailsModal bookings={list} />
        )}
      </main>
    </>
  );
}
