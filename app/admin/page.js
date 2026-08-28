import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { formatEventDate, formatEventTime } from "@/lib/format";
import TopBar from "@/components/TopBar";
import CreateEventForm from "@/components/CreateEventForm";
import LogoutButton from "@/components/LogoutButton";

export const revalidate = 0;

async function getEventsWithCounts() {
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, title, location, event_date, event_time, capacity")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  const { data: counts } = await supabaseAdmin
    .from("event_booking_counts")
    .select("event_id, booked");

  const countsMap = {};
  (counts || []).forEach((c) => {
    countsMap[c.event_id] = c.booked;
  });

  return (events || []).map((e) => ({ ...e, booked: countsMap[e.id] || 0 }));
}

export default async function AdminPage() {
  if (!isAdminRequest()) {
    redirect("/admin/login");
  }

  const events = await getEventsWithCounts();

  return (
    <>
      <TopBar tag="Admin dashboard" />
      <main className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 className="hero-heading">Manage events</h1>
            <p className="hero-sub">Create new sessions and keep an eye on bookings.</p>
          </div>
          <LogoutButton />
        </div>

        <CreateEventForm />

        <h2 className="section-heading">All events</h2>
        {events.length === 0 ? (
          <div className="empty-state">No events yet — create your first one above.</div>
        ) : (
          <ul className="event-list">
            {events.map((event) => {
              const spotsLeft = Math.max(event.capacity - event.booked, 0);
              return (
                <li key={event.id}>
                  <Link href={`/admin/events/${event.id}`} className="event-card">
                    <span className="event-date-chip">
                      {formatEventDate(event.event_date)} &middot;{" "}
                      {formatEventTime(event.event_time)}
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
