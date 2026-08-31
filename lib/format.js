export function formatEventDate(dateStr) {
  // dateStr comes back from Postgres as "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatEventTime(timeStr) {
  // timeStr comes back as "HH:MM:SS"
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(amount) {
  const numeric = Number(amount ?? 0);
  if (!Number.isFinite(numeric)) return "GH₵0.00";

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(numeric);
}
