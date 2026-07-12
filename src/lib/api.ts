// Type-safe API Client Layer for AI Monsoon Copilot FastAPI integration

const getApiUrl = () => {
  // @ts-ignore
  let envUrl = import.meta.env?.VITE_API_URL;
  if (!envUrl && typeof process !== "undefined" && process.env) {
    envUrl = process.env.VITE_API_URL;
  }
  return envUrl || "http://localhost:8000";
};

export const API_BASE_URL = getApiUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Set default JSON Content-Type if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Force redirect if not on auth page
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    const errText = await response.text();
    let message = "An error occurred";
    try {
      const parsed = JSON.parse(errText);
      message = parsed.detail || parsed.message || message;
    } catch {
      message = errText || message;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface WeatherResponse {
  city: string;
  temp: number;
  condition: string;
  wind: number;
  pressure: number;
  visibility: number;
  rainfall: number;
  flood_risk: number;
  safety_score: number;
  checklist_info: { done: number; total: number };
  updatedAt: string;
}

export interface ForecastResponse {
  week: Array<{ day: string; high: number; low: number; rain: number }>;
  hourly_rain: Array<{ hour: string; mm: number }>;
}

export interface ChecklistItem {
  id: number;
  item: string;
  category: string;
  done: boolean;
}

export interface HazardReport {
  id: number;
  type: string;
  severity: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  reports: number;
  status: string;
  created_at: string;
}

export interface FamilyMember {
  id: number;
  name: string;
  location: string;
  status: string;
  phone: string;
  updated_at: string;
}

export interface Shelter {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupancy: number;
  distance: string;
}

export interface AlertData {
  id: number;
  title: string;
  level: string;
  area: string;
  time: string;
  latitude: number | null;
  longitude: number | null;
  body?: string;
}

export const api = {
  // Auth
  auth: {
    register: (
      name: string,
      email: string,
      role: string,
      location_name: string,
      latitude?: number,
      longitude?: number,
      phone?: string
    ) =>
      request<{ message: string; email: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, role, location_name, latitude, longitude, phone }),
      }),
    login: (email: string) =>
      request<{ message: string; email: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    verifyOtp: (email: string, otp: string) =>
      request<AuthResponse>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      }),
    getMe: () => request<UserResponse>("/api/auth/me"),
    updateMe: (payload: {
      name?: string;
      phone?: string;
      location_name?: string;
      latitude?: number | null;
      longitude?: number | null;
      role?: string;
    }) =>
      request<UserResponse>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },

  // Weather
  weather: {
    getCurrent: () => request<WeatherResponse>("/api/weather/current"),
    getForecast: () => request<ForecastResponse>("/api/weather/forecast"),
  },

  // Checklist / Planner
  checklist: {
    get: () => request<ChecklistItem[]>("/api/checklist"),
    toggle: (itemId: number) =>
      request<{ message: string; item: { id: number; done: boolean } }>(
        `/api/checklist/toggle/${itemId}`,
        { method: "POST" }
      ),
    generate: (payload: {
      location: string;
      household_size: number;
      has_elderly: boolean;
      has_children: boolean;
      has_pets: boolean;
    }) =>
      request<ChecklistItem[]>("/api/checklist/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // Community Hazards
  hazards: {
    get: () => request<HazardReport[]>("/api/hazards"),
    report: (formData: FormData) =>
      request<HazardReport>("/api/hazards/report", {
        method: "POST",
        body: formData,
      }),
    confirm: (reportId: number) =>
      request<{ message: string; reports: number }>(
        `/api/hazards/confirm/${reportId}`,
        { method: "POST" }
      ),
  },

  // Chat
  chat: {
    send: (messages: Array<{ role: "user" | "assistant"; text: string }>, language = "English") =>
      request<{ role: "ai"; text: string }>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages, language }),
      }),
  },

  // Family & SOS
  family: {
    get: () => request<FamilyMember[]>("/api/family"),
    create: (name: string, location: string, phone?: string, status = "safe") =>
      request<FamilyMember>("/api/family", {
        method: "POST",
        body: JSON.stringify({ name, location, phone, status }),
      }),
    getShelters: () => request<Shelter[]>("/api/family/shelters"),
    createShelter: (name: string, latitude: number, longitude: number, capacity: number, occupancy = 0) =>
      request<Shelter>("/api/family/shelters", {
        method: "POST",
        body: JSON.stringify({ name, latitude, longitude, capacity, occupancy }),
      }),
    sendSos: (latitude: number, longitude: number, locationName?: string) =>
      request<{
        status: string;
        message: string;
        contacts_notified: number;
        sms_sent: number;
      }>(`/api/family/sos?latitude=${latitude}&longitude=${longitude}${locationName ? `&location_name=${encodeURIComponent(locationName)}` : ""}`, {
        method: "POST",
      }),
  },

  // Emergency Alerts
  alerts: {
    get: () => request<AlertData[]>("/api/alerts"),
    create: (payload: {
      title: string;
      level: string;
      area: string;
      time: string;
      latitude?: number;
      longitude?: number;
    }) =>
      request<AlertData>("/api/alerts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
