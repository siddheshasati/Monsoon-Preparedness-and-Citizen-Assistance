export const mockWeather = {
  city: "Mumbai, Maharashtra",
  temp: 27,
  condition: "Heavy Rainfall",
  humidity: 89,
  wind: 24,
  rainfall: 42,
  pressure: 1004,
  visibility: 3.2,
  updatedAt: new Date().toISOString(),
};

export const rainfallForecast = [
  { hour: "Now", mm: 8, prob: 92 },
  { hour: "+1h", mm: 12, prob: 95 },
  { hour: "+2h", mm: 18, prob: 96 },
  { hour: "+3h", mm: 22, prob: 98 },
  { hour: "+4h", mm: 15, prob: 90 },
  { hour: "+5h", mm: 9, prob: 78 },
  { hour: "+6h", mm: 6, prob: 60 },
  { hour: "+7h", mm: 4, prob: 45 },
];

export const weekForecast = [
  { day: "Mon", high: 30, low: 25, rain: 32, icon: "cloud-rain" },
  { day: "Tue", high: 29, low: 24, rain: 58, icon: "cloud-rain" },
  { day: "Wed", high: 28, low: 24, rain: 72, icon: "cloud-lightning" },
  { day: "Thu", high: 27, low: 23, rain: 85, icon: "cloud-lightning" },
  { day: "Fri", high: 28, low: 24, rain: 45, icon: "cloud-drizzle" },
  { day: "Sat", high: 30, low: 25, rain: 22, icon: "cloud" },
  { day: "Sun", high: 31, low: 26, rain: 10, icon: "sun" },
];

export const alerts = [
  {
    id: "1",
    level: "high" as const,
    title: "Red Alert: Extremely heavy rainfall expected",
    area: "Andheri, Bandra, Kurla",
    time: "Next 6 hours",
    body: "IMD forecasts >200mm rainfall. Avoid non-essential travel. Move vehicles to higher ground.",
  },
  {
    id: "2",
    level: "medium" as const,
    title: "Waterlogging reported",
    area: "SV Road, Milan Subway",
    time: "20 min ago",
    body: "Community reports 2ft water. Traffic diverted via Linking Road.",
  },
  {
    id: "3",
    level: "low" as const,
    title: "Cyclone Biparjoy weakened",
    area: "Coastal Konkan",
    time: "2h ago",
    body: "Wind speeds dropped to 45 kmph. Fishing operations may resume by tomorrow.",
  },
];

export const hazardReports = [
  { id: "h1", type: "Waterlogging", location: "Hindmata Junction", severity: "high", reports: 42, lat: 19.011, lng: 72.836 },
  { id: "h2", type: "Fallen Tree", location: "Marine Drive", severity: "medium", reports: 8, lat: 18.943, lng: 72.823 },
  { id: "h3", type: "Blocked Road", location: "Sion Circle", severity: "high", reports: 27, lat: 19.043, lng: 72.861 },
  { id: "h4", type: "Electric Hazard", location: "Dadar West", severity: "high", reports: 5, lat: 19.018, lng: 72.844 },
  { id: "h5", type: "Waterlogging", location: "Kurla Station", severity: "medium", reports: 19, lat: 19.065, lng: 72.879 },
];

export const shelters = [
  { id: "s1", name: "BMC School Shelter - Dadar", capacity: 250, occupancy: 132, distance: "1.2 km", type: "shelter" },
  { id: "s2", name: "KEM Hospital", capacity: 1800, occupancy: 1240, distance: "2.8 km", type: "hospital" },
  { id: "s3", name: "Bandra Police Station", capacity: 60, occupancy: 22, distance: "3.4 km", type: "police" },
  { id: "s4", name: "St. Xavier Community Hall", capacity: 180, occupancy: 40, distance: "4.1 km", type: "shelter" },
];

export const checklist = [
  { id: "c1", item: "Assemble emergency kit (torch, batteries, first aid)", done: true, category: "Kit" },
  { id: "c2", item: "Store 3 days of drinking water per person", done: true, category: "Supplies" },
  { id: "c3", item: "Charge power banks & essential devices", done: false, category: "Power" },
  { id: "c4", item: "Photograph important documents to cloud", done: false, category: "Documents" },
  { id: "c5", item: "Identify nearest shelter & 2 evacuation routes", done: true, category: "Planning" },
  { id: "c6", item: "Save emergency contacts (BMC 1916, Police 100)", done: true, category: "Contacts" },
  { id: "c7", item: "Move valuables above ground floor", done: false, category: "Home" },
  { id: "c8", item: "Prepare pet safety plan", done: false, category: "Family" },
];

export const familyMembers = [
  { id: "f1", name: "Priya (Wife)", status: "safe", location: "Home - Bandra", updated: "5m ago" },
  { id: "f2", name: "Arjun (Son)", status: "traveling", location: "Andheri Station", updated: "12m ago" },
  { id: "f3", name: "Mom", status: "safe", location: "Dadar Residence", updated: "1h ago" },
];

export const badges = [
  { id: "b1", name: "Kit Ready", emoji: "🎒", unlocked: true },
  { id: "b2", name: "Weather Watcher", emoji: "🌦️", unlocked: true },
  { id: "b3", name: "Community Helper", emoji: "🤝", unlocked: true },
  { id: "b4", name: "Flood Fighter", emoji: "🌊", unlocked: false },
  { id: "b5", name: "First Responder", emoji: "🚨", unlocked: false },
  { id: "b6", name: "Recovery Star", emoji: "⭐", unlocked: false },
];
