export function getEventImage(title = "") {
  const normalizedTitle = title.toLowerCase();

  if (normalizedTitle.includes("hike") || normalizedTitle.includes("trail")) {
    return {
      category: "Outdoor training",
      src: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1400&q=85",
    };
  }

  if (normalizedTitle.includes("yoga")) {
    return {
      category: "Mobility",
      src: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1400&q=85",
    };
  }

  if (normalizedTitle.includes("run") || normalizedTitle.includes("race")) {
    return {
      category: "Endurance",
      src: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1400&q=85",
    };
  }

  return {
    category: "Strength & conditioning",
    src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&q=85",
  };
}