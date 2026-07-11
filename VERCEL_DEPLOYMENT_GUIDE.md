# Deploying Monsoon Copilot on Vercel (Free Tier)

This guide provides step-by-step instructions for deploying both the **FastAPI Backend** and the **TanStack Start Frontend** on Vercel for free.

---

## Architecture Overview

```mermaid
graph TD
    Client[Browser] -->|VITE_API_URL| Frontend[TanStack Start Frontend Vercel Web App]
    Client -->|API Requests| Backend[FastAPI Vercel Serverless Function]
    Backend -->|SQLAlchemy| DB[(PostgreSQL Database Neon/Supabase)]
```

- **Backend**: Python FastAPI service running as a Vercel Serverless Function.
- **Frontend**: TanStack Start SSR React App built with Vite/Nitro, running as a Vercel Node.js deployment.
- **Database**: Free hosted PostgreSQL database (e.g., Neon or Supabase) because Vercel functions are stateless and do not support SQLite database file persistence.

---

## Step 1: Create a Free PostgreSQL Database

Since Vercel is stateless, we need a hosted database.
1. Go to [Neon](https://neon.tech/) or [Supabase](https://supabase.com/) and sign up for a free tier account.
2. Create a new PostgreSQL project (e.g., `monsoon-copilot`).
3. Copy the **Connection String** (which starts with `postgres://` or `postgresql://`).
   * *Example:* `postgresql://user:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

---

## Step 2: Deploy the Backend (FastAPI Web Service)

1. Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository.
3. In the project configuration:
   - **Project Name**: `monsoon-copilot-backend`
   - **Framework Preset**: `Other`
   - **Root Directory**: Click `Edit` and select **`backend`**.
4. Expand the **Environment Variables** section and add the following keys:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | *Your PostgreSQL Connection String* | Ensure it starts with `postgresql://` (or `postgres://`). |
| `JWT_SECRET` | *A secure random string* | Used to sign authorization tokens. |
| `GROQ_API_KEY` | *Your Groq API key* | Required for AI functions. |
| `OPENWEATHER_API_KEY` | *Your OpenWeather API key* | Required for live weather alerts. |
| `GEMINI_API_KEY` | *Your Gemini API key* | Optional. |
| `CLOUDINARY_URL` | *Your Cloudinary integration URL* | Optional (required for hazard image uploads). |

5. Click **Deploy**. Vercel will build and deploy the backend. Copy your deployed project's URL (e.g., `https://monsoon-copilot-backend.vercel.app`).

---

## Step 3: Deploy the Frontend (TanStack Start React App)

1. Go to your [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Import the same GitHub repository.
3. In the project configuration:
   - **Project Name**: `monsoon-copilot-frontend`
   - **Framework Preset**: `Vite` (or leave as `Other`)
   - **Root Directory**: Leave as the **project root** (do not select backend).
   - **Build Command**: `NITRO_PRESET=vercel npm run build`
   - **Output Directory**: `.vercel/output` (automatically detected/configured by Nitro)
4. Expand the **Environment Variables** section and add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | *Your Vercel Backend URL* | **CRITICAL**: The URL from Step 2 (e.g., `https://monsoon-copilot-backend.vercel.app`). Do not add a trailing slash. |

5. Click **Deploy**. Vercel will build and deploy your React app.

---

## Verification & Production Checklist

1. **Static Assets / Uploads**: Since Vercel Serverless is read-only, image uploads for community hazards must go to Cloudinary. Ensure `CLOUDINARY_URL` is set in the backend environment variables if you want to support hazard image uploads.
2. **Database Migrations**: The backend automatically runs database migrations on startup (`Base.metadata.create_all(bind=engine)`), so your tables will be automatically created in Neon/Supabase on first run.
3. **CORS Policy**: The backend is configured to accept requests from all origins by default, so it will seamlessly accept requests from your frontend Vercel domain.
