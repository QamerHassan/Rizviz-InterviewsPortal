<div align="center">

<img src="docs/dashboard.png" alt="Rizviz ERP — Interviews Portal" width="100%" style="border-radius:16px;" />

<br/><br/>

# ✦ Rizviz ERP — Interviews Portal

**A full-stack, enterprise-grade Recruitment & Interview Management System**  
built for Rizviz International Impex — managing candidates, interviews, feedback, leads, and real-time notifications from a single elegant platform.

<br/>

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-8-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Ant Design](https://img.shields.io/badge/Ant_Design-5-0170FE?style=for-the-badge&logo=antdesign&logoColor=white)](https://ant.design/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-2019-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/en-us/sql-server)
[![SignalR](https://img.shields.io/badge/SignalR-Real--Time-7B2FBE?style=for-the-badge&logo=signal&logoColor=white)](https://dotnet.microsoft.com/apps/aspnet/signalr)

</div>

---

## ✦ Overview

Rizviz ERP is a **production-ready, mobile-responsive** recruitment portal designed for internal HR teams. It provides a unified workspace to manage the full interview lifecycle — from initial candidate sourcing through to placement, with AI-assisted feedback generation, Google Sheets sync, and real-time push notifications.

---

## ✦ Key Features

| Module | Capability |
|---|---|
| 🗂 **Interviews** | Full CRUD, Excel sync, status tracking, smart filters, grid/list view |
| 📅 **Google-Style Calendar** | Complete Google Calendar workflow — Day, Multi-Day, Week & Month views, multi-timezone switcher, developer availability, trash & restore, and mobile app flow |
| 🤖 **AI Feedback** | Voice recording → Urdu/English transcription → AI enhancement via Groq |
| 👥 **Candidates** | Candidate profiles linked to interview history and status drawers |
| 📊 **Dashboard** | Live KPI cards, Recharts bar/line/pie charts, dark & light mode |
| 📋 **Leads** | Lead management with outcome tracking and recruiter assignment |
| 🔔 **Notifications** | Real-time SignalR push alerts for interview changes |
| 📤 **Google Sheets Sync** | Bidirectional sync — feedback auto-appended to Google Sheet on save |
| 👤 **User Management** | Admin role with first-login setup flow and branch/company switching |
| 📱 **Mobile Responsive** | Full mobile optimization — touch-friendly drawers, swipe-scroll tables, responsive modals |

---

## ✦ Google Calendar Experience & Functionality

The portal features a **Google Calendar-inspired interface** crafted for enterprise interview scheduling:

### 1. Flexible Multi-View Engine
- **1 Day View**: Detailed 24-hour vertical timeline (12 AM – 11 PM) with interactive time slots, red current-time marker, and event card details.
- **Multi-Day Views (2, 3, 4, 5 Days)**: Side-by-side comparison across custom day ranges for team scheduling.
- **Week View (7 Days)**: Full Sunday-to-Saturday schedule grid showing all-day banners and timed interview slots.
- **Month View**: Complete monthly grid with color-coded event chips, developer availability badges, and compact indicators.

### 2. Google Calendar Mobile App Flow
- **100% Viewport Month View**: All 7 days (`Sun` to `Sat`) fit within the phone screen width with zero cutoff or horizontal scrolling.
- **Tap-to-Day Navigation**: Tapping any day cell in Month View instantly opens that day's **1-Day Timeline View** (mirroring Google Calendar mobile app behavior).
- **Mobile Header View Switcher**: A dedicated view selector dropdown (`[Week ▾]`, `[1 Day ▾]`, `[Month ▾]`) placed right next to `Today` button, always visible and never cut off.
- **Slide-in Google Calendar Drawer (☰)**:
  - Quick **Calendar View** 2×2 button grid (`1 Day`, `3 Days`, `Week`, `Month`).
  - Interactive mini-month calendar picker with date jump.
  - Real-time candidate & tech stack filters.
  - One-tap "Add Interview" and "Check Availability" actions.

### 3. Global Timezone Intelligence
- **One-Click Timezone Switcher**: Instantly re-render schedules across international recruiter and client timezones:
  - 🇺🇸 **EST** (US Eastern · New York)
  - 🇺🇸 **CST** (US Central · Chicago)
  - 🇺🇸 **PST** (US Pacific · San Francisco)
  - 🇵🇰 **PKT** (Pakistan Standard Time)
  - 🌐 **Local Browser Time**
- Dual timezone column display option for cross-border interview alignment.

### 4. Developer Availability & Scheduling
- Visual availability blocks highlighting candidate and developer free slots vs. emergency leaves and off-hours.
- Conflict detection preventing double bookings.
- Real-time updates broadcast via Microsoft SignalR.

### 5. Google Workspace Settings & Utility Suite
- **Trash & Soft-Delete**: Deleted interviews are preserved in a Google-style **Trash Bin** with one-click restore.
- **Print & Export**: Print visual calendar grids or clean text agendas with customizable orientation (Landscape / Portrait).
- **Appearance & Density**: Switch between Comfortable and Compact view densities, customize accent colors, and toggle recruiter avatars.
- **Keyboard Shortcuts**: Power-user shortcuts:
  - `T` — Jump to Today
  - `1` – `6` — Switch to 1–6 Days View
  - `W` — Week View (7 Days)
  - `M` — Month View
  - `/` — Focus interview search
  - `Esc` — Close active modal/drawer

---

## ✦ Tech Stack

### Frontend
- **React 18** + **Redux Toolkit** (RTK Query for API state)
- **Ant Design 5** — component library
- **Tailwind CSS 3** — utility-first styling
- **Recharts** — data visualization
- **Microsoft SignalR** — real-time WebSocket client
- **Day.js** — date handling

### Backend
- **ASP.NET Core 8** Web API
- **Entity Framework Core** + **SQL Server 2019**
- **SignalR Hubs** — real-time notification broadcasting
- **Google Sheets API** — feedback persistence layer
- **Groq AI API** — Urdu/English transcription and enhancement
- **JWT Authentication** with role-based access control

---

## ✦ Project Structure

```
RizvizERP/
├── RizvizERP.API/          # ASP.NET Core backend
│   ├── Controllers/        # REST API endpoints
│   ├── Models/             # EF Core entity models
│   ├── Services/           # Business logic & integrations
│   ├── Hubs/               # SignalR notification hub
│   ├── Migrations/         # EF Core database migrations
│   └── DTOs/               # Data transfer objects
│
├── rizviz-frontend/        # React frontend
│   └── src/
│       ├── pages/          # Interviews, Dashboard, Calendar, Leads, Feedback…
│       ├── components/     # StatCard, TopNavbar, Drawers, MainLayout…
│       ├── store/          # Redux slices + RTK Query API
│       └── utils/          # Status helpers, table columns
│
├── scripts/                # PowerShell startup & SQL migration scripts
└── docs/                   # Admin manual & screenshots
```

---

## ✦ Getting Started

### Prerequisites
- Node.js 18+
- .NET 8 SDK
- SQL Server 2019 (or Express)
- Google Cloud credentials JSON (for Sheets sync)

### 1 — Backend

```bash
# Configure your connection string in appsettings.json
cd RizvizERP.API
dotnet restore
dotnet ef database update
dotnet run
# API runs at http://localhost:5000
```

### 2 — Frontend

```bash
cd rizviz-frontend
npm install
npm start
# App runs at http://localhost:3000
```

### 3 — Quick Start (PowerShell)

```powershell
# Start SQL Server, API, and frontend in one go
.\scripts\start-api.ps1
.\scripts\start-frontend.ps1
```

---

## ✦ Environment Variables

Create a `.env` file in the project root (never commit this):

```env
REACT_APP_API_URL=http://localhost:5000/api
```

And in `RizvizERP.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=RizvizERP;..."
  },
  "Jwt": { "Secret": "your-jwt-secret" },
  "GoogleSheets": { "SpreadsheetId": "your-sheet-id" },
  "Groq": { "ApiKey": "your-groq-key" }
}
```

---

## ✦ Roles & Access

| Role | Access |
|---|---|
| **Admin** | Full access — all modules, user management, Excel upload |
| **Interviewee** | Interviews page — own records only, feedback submission |
| **Job Hunter** | Interviews page — filtered by assigned stack |
| **Both** | Dashboard + Interviews — combined recruiter view |

---

## ✦ Mobile Responsiveness

The portal is fully optimized for mobile devices with an app-like experience:

- 🗓 **Google Calendar Mobile Flow**: Month view fits all 7 days 100% across the viewport (no horizontal scroll or cutoff); tapping any date navigates directly to the 1-Day timeline.
- 🎛 **Persistent View Switcher**: Header view dropdown (`1 Day`, `Week`, `Month`) and timezone indicator stay clearly visible and unclipped on narrow screens (360px+).
- ☰ **Slide-in Calendar Menu**: Mobile drawer includes quick Google Calendar-style view buttons (`1 Day`, `3 Days`, `Week`, `Month`), mini date picker, and filters.
- 📱 **Full-Screen Drawers**: Drawers dynamically expand to full screen (`100vw`) on phones for comfortable viewing and editing.
- 📊 **Touch-Friendly Controls**: Status cards, filters, and tables support horizontal swipe-scrolling on compact viewports.
- 🔲 **Adaptive Modals**: All modals and confirmation dialogs adapt with a responsive `95vw` cap.
- 📝 **Responsive Forms**: Multi-column form layouts automatically stack to a single column below the `sm` breakpoint.

---

## ✦ License

This project is proprietary software developed for **Rizviz International Impex**.  
All rights reserved © 2026 Rizviz Int. Impex.

---

<div align="center">

Made with ❤️ by Qamer Hassan

</div>
