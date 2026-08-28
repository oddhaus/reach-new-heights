import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatEventDate, formatEventTime } from "@/lib/format";
import TopBar from "@/components/TopBar";
import CreateEventForm from "@/components/CreateEventForm";
import CategoryManager from "@/components/CategoryManager";

export const revalidate = 0;

async function getEventsWithCounts() {
  let { data: events, error } = await supabaseAdmin
    .from("events")
    .select("id, title, location, event_date, event_time, event_end_time, capacity")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error?.message?.includes("event_end_time")) {
    const fallback = await supabaseAdmin
      .from("events")
      .select("id, title, location, event_date, event_time, capacity")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });
    events = fallback.data;
  }

  const { data: counts } = await supabaseAdmin
    .from("event_booking_counts")
    .select("event_id, booked");

  const countsMap = {};
  (counts || []).forEach((c) => {
    countsMap[c.event_id] = c.booked;
  });

  return (events || []).map((e) => ({ ...e, booked: countsMap[e.id] || 0 }));
}

async function getCategories() {
  const { data } = await supabaseAdmin.from("categories").select("id, name").order("name");
  return data || [];
}

export default async function AdminPage() {
  if (!(await isAdminRequest())) {
    redirect("/admin/login");
  }

  const events = await getEventsWithCounts();
  const categories = await getCategories();

  return (
    <>
      <TopBar tag="Admin dashboard" isAdmin />
      <main className="container admin-surface">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 className="hero-heading">Manage events</h1>
            <p className="hero-sub">Create new sessions and keep an eye on bookings.</p>
          </div>
        </div>

        <CreateEventForm categories={categories} />
        <CategoryManager categories={categories} />

        <h2 className="section-heading">All events</h2>
        {events.length === 0 ? (
          <div className="empty-state">No events yet — create your first one above.</div>
        ) : (
          <ul className="admin-event-list">
            {events.map((event) => {
              const spotsLeft = Math.max(event.capacity - event.booked, 0);
              return (
                <li key={event.id}>
                  <Link href={`/admin/events/${event.id}`} className="admin-event-card">
                    <span className="event-date-chip">
                      {formatEventDate(event.event_date)} &middot; {formatEventTime(event.event_time)}{event.event_end_time ? ` - ${formatEventTime(event.event_end_time)}` : ""}
                    </span>
                    <h2 className="event-title">{event.title}</h2>
                    <p className="event-meta">{event.location}</p>
                    <p className="helper-text" style={{ margin: 0 }}>
                      {event.booked} / {event.capacity} booked &middot;{" "}
                      {spotsLeft === 0 ? "Full" : `${spotsLeft} left`}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
