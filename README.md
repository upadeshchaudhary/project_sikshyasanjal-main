<div align="center">

# 🏫 SikshyaSanjal
### School Management Web Application for Nepali Educational Institutions

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v3-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**SikshyaSanjal** is a multi-tenant, role-based school management web application designed for Nepali schools. It digitizes attendance, homework, exam results, fees, notices, and parent–teacher communication — all in one centralized platform.

> 🎓 Final Year Capstone Project · BIT Program · CCT Dharan, Tribhuvan University · 2026

</div>

---

## 📚 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Seed the Database](#4-seed-the-database)
  - [5. Run the Application](#5-run-the-application)
- [Environment Variables](#-environment-variables)
- [Authentication Flow](#-authentication-flow)
- [Multi-Tenancy](#-multi-tenancy)
- [Role Permissions](#-role-permissions)
- [API Overview](#-api-overview)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌐 Overview

Most schools in Nepal still rely on physical registers, printed notices, and phone calls for academic updates. SikshyaSanjal replaces this with a centralized, role-aware web platform accessible from any device.

Each school operates on its **own completely isolated instance** using a unique domain slug. A parent opens the app and immediately sees their child's attendance, homework, and fee dues. A teacher marks attendance and messages parents from one screen. An admin has a live overview of the entire institution.

---

## ✨ Features

| Feature | Admin | Teacher | Parent |
|---|:---:|:---:|:---:|
| Dashboard (role-specific) | ✅ | ✅ | ✅ |
| Student Management | ✅ Full CRUD | ✅ View | ✅ Own child |
| Teacher Management | ✅ Full CRUD | ✅ Own profile | ❌ |
| Homework | ✅ | ✅ Post/Edit | ✅ Read-only |
| Attendance Marking | ✅ | ✅ | ✅ View only |
| Exam Results | ✅ | ✅ Upload | ✅ View only |
| Notices | ✅ Post/Delete any | ✅ Post/Delete own | ✅ Read-only |
| Fee Tracking | ✅ Full | ❌ | ✅ View dues |
| Messaging | ✅ | ✅ | ✅ |
| Academic Calendar (BS) | ✅ Manage | ✅ View | ✅ View |
| Class Routine | ✅ | ✅ Edit | ✅ View |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | Component-based UI |
| React Router v6 | Client-side navigation |
| Tailwind CSS v3 | Utility-first styling |
| Axios | HTTP client with interceptors |
| Recharts | Attendance & performance charts |
| React Hot Toast | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| MongoDB + Mongoose | Database & ODM |
| JWT (jsonwebtoken) | Token-based auth |
| bcryptjs | Password hashing (salt: 12) |
| Sparrow SMS | OTP delivery for Nepali numbers |
| Google OAuth 2.0 | Teacher & admin login |
| Helmet + express-rate-limit | Security hardening |
| Morgan | Request logging |

### Calendar
Custom Bikram Sambat ↔ Gregorian conversion utility (JavaScript lookup table, no external library).

---

## 📁 Project Structure

```
sikshyasanjal/
├── frontend/                            # React 18 application
│   ├── public/
│   │   └── index.html                   # HTML Template for React Application
│   ├── src/
│   │   ├── components/                  # Reusable UI
│   │   │   ├── Sidebar.jsx
│   │   │   └── Topbar.jsx         
│   │   ├── context/                     # AppContext.jsx — global auth & user state
│   │   │   └── AppContext.jsx
│   │   ├── data/                        # mockData.js
│   │   │   └── mockData.js
│   │   ├── pages/                       # Route-level page components
│   │   │   ├── AttendancePage.jsx
│   │   │   ├── CalendarPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── FeesPage.jsx
│   │   │   ├── GoogleCallbackPage.jsx
│   │   │   ├── HomeworkPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── MessagesPage.jsx
│   │   │   ├── NoticesPage.jsx
│   │   │   ├── ResultsPage.jsx
│   │   │   ├── RoutinePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   ├── StudentsPage.jsx
│   │   │   └── TeachersPage.jsx
│   │   ├── utils/                      # BS calendar helper, formatters
│   │   │   └── calender.js    
│   │   ├── App.jsx                     # Routes + RoleGuard
│   │   ├── index.css                   # Design tokens, glassmorphism, responsive rules
│   │   └── index.js
│   ├── .env
│   └── package.json
│
├── backend/                            # Node.js + Express API
│   ├── middleware/
│   │   ├── auth.js                     # JWT verification + role-based access control
│   │   └── school.js                   # x-school-domain → ObjectId resolver
│   ├── models/                         # Mongoose schemas
│   │   ├── AcademicCalendar.js
│   │   ├── Attendance.jsUser.js
│   │   ├── ClassRoutine.js
│   │   ├── ExamResult.js
│   │   ├── FeeRecord.js
│   │   ├── Homework.js
│   │   ├── index.js
│   │   ├── Message.js
│   │   ├── Notice.js
│   │   ├── School.js
│   │   ├── Student.js
│   │   └── User.js
│   ├── routes/                         # Express route files per resource
│   │   ├── attendance.js
│   │   ├── auth.js
│   │   ├── calendar.js
│   │   ├── dashboard.js
│   │   ├── fees.js
│   │   ├── homework.js
│   │   ├── messages.js
│   │   ├── notices.js
│   │   ├── results.js
│   │   ├── routine.js
│   │   ├── search.js
│   │   ├── settings.js
│   │   ├── students.js
│   │   └── teachers.js
│   ├── seeder.js                       # Demo school + sample data
│   ├── server.js                       # Express app entry point
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## ✅ Prerequisites

Make sure you have the following installed before you begin:

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **Git** — [Download](https://git-scm.com/)
- A **MongoDB Atlas** account (free tier is sufficient) — [Sign up](https://cloud.mongodb.com/)
- A **Google Cloud Console** project with OAuth 2.0 credentials — [Setup guide](https://developers.google.com/identity/protocols/oauth2)
- A **Sparrow SMS** account with API key — [sparrowsms.com](https://sparrowsms.com/)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/upadeshchaudhary/project_sikshyasanjal-main.git
cd project_sikshyasanjal-main
```

---

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Install all dependencies
npm install
```

Create the backend environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in your values (see [Environment Variables](#-environment-variables) section below).

---

### 3. Frontend Setup

Open a **new terminal window** and run:

```bash
# Navigate to the frontend directory
cd frontend

# Install all dependencies
npm install
```

Create the frontend environment file:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
REACT_APP_API_URL=http://localhost:5000
```

---

### 4. Seed the Database

Before running the app for the first time, populate the database with demo data:

```bash
# From the backend directory
cd backend
node seeder/seed.js
```

This creates:
- A demo school with domain slug `demo`
- An admin account
- Sample teachers, students, and parents
- Sample homework, notices, and attendance records

> **Tip:** To wipe and re-seed, run: `node seeder/seed.js --reset`

---

### 5. Run the Application

**Start the backend server** (from the `backend/` directory):

```bash
npm run dev
```

The API will be running at: `http://localhost:5000`

**Start the frontend** (from the `frontend/` directory, in a separate terminal):

```bash
npm start
```

The app will open at: `http://localhost:3000`

**Login with demo credentials:**

| Role | School Domain | Email / Phone | Password |
|---|---|---|---|
| Admin | `demo` | `admin@demo.com` | `Admin@1234` |
| Teacher | `demo` | `teacher@demo.com` | *(Google OAuth)* |
| Parent | `demo` | `9800000000` | OTP via Sparrow SMS |

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sikshyasanjal

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Sparrow SMS (OTP for parents)
SPARROW_SMS_TOKEN=your_sparrow_sms_token
SPARROW_SMS_FROM=SikshyaSanjal

# CORS
CLIENT_URL=http://localhost:3000

# OTP Settings
OTP_EXPIRY_MINUTES=5
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

> ⚠️ **Never commit `.env` files to version control.** They are listed in `.gitignore` by default.

---

## 🔑 Authentication Flow

SikshyaSanjal uses **different auth methods per role**, optimized for each user type:

```
┌─────────────────────────────────────────────────────────┐
│                   LOGIN PAGE (Step 1)                   │
│              Enter your school domain slug              │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   Select Your Role    │
          └──┬──────────┬────────┘
             │          │
      ┌──────▼──┐   ┌───▼──────────────────┐
      │  Parent  │   │  Teacher / Admin     │
      └──────┬──┘   └───┬──────────────────┘
             │           │
      ┌──────▼──┐   ┌───▼──────────────────┐
      │Phone No. │   │  Google OAuth 2.0    │
      │+ OTP via │   │  (or email/password) │
      │Sparrow   │   └──────────────────────┘
      │SMS       │
      └──────────┘

All roles → JWT issued → x-school-domain header on every request
```

- **Parents:** Enter phone number → receive OTP via Sparrow SMS → verified → JWT issued. Returning parents can use password login.
- **Teachers & Admins:** Google OAuth flow → backend verifies identity token → JWT issued.
- **Every request** carries `Authorization: Bearer <token>` and `x-school-domain: <slug>`.

---

## 🏢 Multi-Tenancy

SikshyaSanjal uses a **multi-tenant single-database** architecture:

- Every MongoDB document contains a `school` field (ObjectId).
- Every API request carries an `x-school-domain` header.
- The `school.js` middleware resolves the domain slug to a school ObjectId and attaches it to `req.schoolId`.
- **Every database query** is automatically scoped with `{ school: req.schoolId }`.

This guarantees that a query from School A **can never return data belonging to School B**.

```
Client Request
     │
     ▼
x-school-domain: "greenfield"
     │
     ▼
school.js middleware → resolves to ObjectId("6634abc...")
     │
     ▼
All DB queries: { school: ObjectId("6634abc..."), ...filter }
```

---

## 👥 Role Permissions

| Action | Admin | Teacher | Parent |
|---|:---:|:---:|:---:|
| Add/Edit/Delete students | ✅ | ❌ | ❌ |
| Add/Edit/Delete teachers | ✅ | ❌ | ❌ |
| Post homework | ✅ | ✅ | ❌ |
| Delete homework | ✅ Any | ✅ Own only | ❌ |
| Post notice | ✅ | ✅ | ❌ |
| Delete notice | ✅ Any | ✅ Own only | ❌ |
| Upload exam results | ✅ | ✅ | ❌ |
| Mark attendance | ✅ | ✅ | ❌ |
| Record fee payment | ✅ | ❌ | ❌ |
| View fee status | ✅ | ❌ | ✅ Own child |
| Send messages | ✅ | ✅ | ✅ |
| School settings | ✅ | ❌ | ❌ |

---

## 📡 API Overview

Base URL: `http://localhost:5000/api`

All endpoints require:
- `Authorization: Bearer <jwt_token>`
- `x-school-domain: <school_slug>`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/parent/otp` | Send OTP to parent phone |
| POST | `/auth/parent/verify` | Verify OTP & issue JWT |
| GET | `/auth/google` | Google OAuth redirect |
| GET | `/students` | List students (scoped) |
| POST | `/students` | Add student (admin) |
| PUT | `/students/:id` | Update student (admin) |
| DELETE | `/students/:id` | Delete student (admin) |
| GET | `/homework` | Get homework by class |
| POST | `/homework` | Create homework |
| GET | `/attendance/:classId/:date` | Get attendance for date |
| POST | `/attendance` | Mark attendance |
| GET | `/results/:studentId` | Get exam results |
| POST | `/results` | Upload exam marks |
| GET | `/notices` | Get all notices |
| POST | `/notices` | Post notice |
| GET | `/fees/:studentId` | Get fee records |
| POST | `/fees` | Record payment |
| GET | `/messages` | Get inbox |
| POST | `/messages` | Send message |
| GET | `/routine/:classId` | Get class timetable |
| GET | `/calendar` | Get academic calendar |

---

## ☁️ Deployment

### Frontend → Vercel

```bash
# From the frontend directory
npm run build

# Deploy via Vercel CLI
npx vercel --prod
```

Set `REACT_APP_API_URL` to your live backend URL in the Vercel dashboard environment variables.

### Backend → Render / Railway

1. Push your `backend/` folder to a GitHub repository.
2. Connect the repo on [Render](https://render.com) or [Railway](https://railway.app).
3. Set all environment variables from `backend/.env` in the platform dashboard.
4. Set the start command to: `node server.js`

### Database → MongoDB Atlas

1. Create a free cluster on [MongoDB Atlas](https://cloud.mongodb.com).
2. Whitelist your server's IP address (or `0.0.0.0/0` for open access during development).
3. Copy the connection URI and set it as `MONGO_URI` in your backend `.env`.

---

## 📸 Screenshots

> _Screenshots will be added after final UI polish._

| Admin Dashboard | Parent Dashboard | Attendance Page |
|---|---|---|
| _(coming soon)_ | _(coming soon)_ | _(coming soon)_ |

---

## 🤝 Contributing

This is a final year academic project. Contributions are welcome for bug fixes and improvements.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ for Nepali schools by **Upadesh Chaudhary and Team**  
BIT Final Year · CCT Dharan · Tribhuvan University · 2026

**[⬆ Back to top](#-sikshyasanjal)**

</div>
