# SikshyaSanjal 🏫
### School Management Platform for Nepali Schools

A full-stack web application that digitizes day-to-day academic and administrative operations for schools in Nepal. Multi-tenant, role-based, and built for low-bandwidth mobile access.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + React Router v6 |
| Styling | Tailwind CSS v3 + Custom CSS |
| Charts | Recharts |
| HTTP | Axios |
| Notifications | React Hot Toast |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| OAuth | Google OAuth 2.0 |
| OTP SMS | Sparrow SMS (Nepal) |
| Security | Helmet + express-rate-limit |

---

## Project Structure

```
sikshyasanjal/


backend/
├── .env                         
├── package-lock.json                 
├── package.json                 
├── server.js                    
│
├── middleware/
│   ├── auth.js                  
│   └── school.js                
│
├── models/
│   ├── index.js                 
│   ├── School.js                
│   ├── User.js                  
│   ├── Student.js               
│   ├── Homework.js              
│   ├── Notice.js                  
│   ├── Attendance.js              
│   ├── ExamResult.js              
│   ├── FeeRecord.js               
│   ├── Message.js                 
│   ├── ClassRoutine.js            
│   └── AcademicCalendar.js        
│
└── routes/
    ├── auth.js                    
    ├── students.js                
    ├── teachers.js                
    ├── homework.js                
    ├── attendance.js              
    ├── notices.js                 
    ├── results.js                 
    ├── fees.js                    
    ├── routine.js                
    ├── messages.js                
    ├── calendar.js                
    ├── settings.js                
    ├── dashboard.js               
    └── search.js                    


frontend/src/
├── .env                         
├── App.jsx                        
├── index.css    
├── index.js
│
├── data
│   └── mockData.js
│
├── context/
│   └── AppContext.jsx             
│
├── components/
│   ├── Sidebar.jsx                
│   └── Topbar.jsx                 
│
├── pages/
│   ├── LoginPage.jsx              
│   ├── GoogleCallbackPage.jsx     
│   ├── DashboardPage.jsx          
│   ├── AttendancePage.jsx         
│   ├── StudentsPage.jsx          
│   ├── HomeworkPage.jsx            
│   ├── NoticesPage.jsx             
│   ├── ResultsPage.jsx             
│   ├── FeesPage.jsx                
│   ├── MessagesPage.jsx            
│   ├── TeachersPage.jsx            
│   ├── RoutinePage.jsx             
│   ├── CalendarPage.jsx            
│   └── SettingsPage.jsx            
│
└── utils/
    └── calendar.js             















├── frontend/                   # React frontend
│
├── src/                        
│   ├── components/
│   │   ├── Sidebar.jsx         # Navigation sidebar (role-aware)
│   │   └── Topbar.jsx          # Header with search + notifications
│   ├── context/
│   │   └── AppContext.jsx      # Global auth & school state
│   ├── data/
│   │   └── mockData.js         # Demo data (students, teachers, etc.)
│   ├── pages/
│   │   ├── LoginPage.jsx       # Multi-role login (OTP / Google / Email)
│   │   ├── DashboardPage.jsx   # Role-specific dashboards
│   │   ├── StudentsPage.jsx    # CRUD student roster
│   │   ├── TeachersPage.jsx    # Teacher profiles
│   │   ├── HomeworkPage.jsx    # Post & view assignments
│   │   ├── AttendancePage.jsx  # Daily marking + calendar view
│   │   ├── ResultsPage.jsx     # Exam marks + GPA calculation
│   │   ├── NoticesPage.jsx     # School notice board
│   │   ├──SettingsPage.jsx     # Settings and configuration
│   │   ├── FeesPage.jsx        # Fee tracking + payment records
│   │   ├── MessagesPage.jsx    # Parent-teacher messaging
│   │   ├── RoutinePage.jsx     # Weekly class timetable
│   │   └── CalendarPage.jsx    # Academic calendar (Bikram Sambat)
│   ├── utils/
│   │   └── calendar.js         # BS ↔ AD conversion utility
│   ├── App.jsx                 # Root with routing
│   └── index.css               # Design system + global styles
│
└── backend/                    # Express API
    ├── models/
    │   └── index.js            # All Mongoose schemas
    ├── middleware/
    │   └── auth.js             # JWT auth + role guard
    ├── routes/
    │   ├── auth.js             # Login, OTP, Google OAuth
    │   ├── students.js
    │   ├── teachers.js
    │   ├── homework.js
    │   ├── notices.js
    │   ├── attendance.js
    │   ├── results.js
    │   ├── fees.js
    │   ├── messages.js
    │   ├── routine.js
    │   └── calendar.js
    ├── server.js               # Express app entry point
    ├── seeder.js               # Demo data seeder
    └── .env.example            # Environment variables template
```

---

## Quick Start

### 1. Frontend (Demo Mode — no backend needed)

```bash
cd sikshyasanjal
npm install
npm start
```

Open http://localhost:3000 — uses mock data, no backend required.

**Demo login:** Select any role (Admin / Teacher / Parent), enter domain `saraswati`, click Sign In.

---

### 2. Full Stack Setup

#### Backend

```bash
cd sikshyasanjal/backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.

# Seed demo data
node seeder.js

# Start server
npm run dev   # development with nodemon
npm start     # production
```

#### Frontend (connected to backend)

```bash
# In frontend directory, create .env
echo "REACT_APP_API_URL=http://localhost:5000" > .env

npm start
```

---

## User Roles

### 👨‍💼 Admin
Full access to all features: school configuration, user management, fee tracking, academic calendar, all reports.

### 👩‍🏫 Teacher
Operational access: post homework, mark attendance, upload exam results, manage class routine, message parents.

### 👪 Parent
Read-only access to their child's data: attendance, homework, results, fee status, school notices. Can message teachers.

---

## Features

| Feature | Admin | Teacher | Parent |
|---|---|---|---|
| Dashboard | ✅ Full | ✅ Classes only | ✅ Child only |
| Students | ✅ CRUD | ✅ View | ❌ |
| Teachers | ✅ CRUD | ❌ | ❌ |
| Homework | ✅ Post/Edit | ✅ Post/Edit | 👁️ View |
| Attendance | ✅ Mark/View | ✅ Mark/View | 👁️ Calendar |
| Exam Results | ✅ Upload | ✅ Upload | 👁️ View |
| Notices | ✅ Post/Delete | ✅ Post | 👁️ View |
| Fees | ✅ Full | ❌ | 👁️ Own child |
| Messages | ✅ All | ✅ Parents | ✅ Teachers |
| Class Routine | ✅ Edit | ✅ Edit | 👁️ View |
| Calendar (BS) | ✅ Add/Edit | 👁️ View | 👁️ View |

---

## API Endpoints

All endpoints require:
- `Authorization: Bearer <jwt_token>`
- `x-school-domain: <school_domain>` header for multi-tenant isolation

```
POST   /api/auth/login           Teacher/Admin email login
POST   /api/auth/otp/send        Send OTP to parent phone
POST   /api/auth/otp/verify      Verify OTP and get token
POST   /api/auth/google          Google OAuth login

GET    /api/students             List students (filter: ?class=10A&search=aarav)
POST   /api/students             Add student
PUT    /api/students/:id         Update student
DELETE /api/students/:id         Remove student (admin only)

GET    /api/teachers             List teachers
POST   /api/teachers             Add teacher (admin only)

GET    /api/homework             List homework (filter: ?class=10A)
POST   /api/homework             Post homework
PUT    /api/homework/:id         Edit homework
DELETE /api/homework/:id         Delete homework

GET    /api/attendance           Get records (filter: ?class=10A&date=2082-01-18)
POST   /api/attendance/bulk      Save bulk attendance

GET    /api/results              Get results (filter: ?student=id&class=10A)
POST   /api/results              Upload exam marks (auto-calculates GPA)

GET    /api/fees                 List fee records
GET    /api/fees/summary         Summary (admin only)
POST   /api/fees                 Create fee record
PUT    /api/fees/:id             Update payment status

GET    /api/messages             Inbox/outbox
GET    /api/messages/:id/thread  Full conversation thread
POST   /api/messages             Send message
PUT    /api/messages/:id/read    Mark as read

GET    /api/routine/:class       Get class timetable
PUT    /api/routine/:class       Update timetable

GET    /api/calendar             List events (filter: ?month=10)
POST   /api/calendar             Add event (admin only)
DELETE /api/calendar/:id         Remove event
```

---

## Multi-Tenant Architecture

Each API request carries an `x-school-domain` header which middleware resolves to a school ObjectId. Every database query is scoped to that school:

```javascript
// Every model document has a `school` field
const filter = { school: req.school._id, ...queryFilters };
```

This ensures School A can never access School B's data, while all schools share the same MongoDB instance for cost efficiency.

---

## Deployment

**Frontend** → Vercel / Netlify (free tier)
```bash
npm run build
# Deploy the /build folder
```

**Backend** → Render / Railway / DigitalOcean Droplet
```bash
# Set environment variables in your platform dashboard
npm start
```

**Database** → MongoDB Atlas Free Tier (512MB, sufficient for ~500 students)

---

## Bikram Sambat Calendar

Nepal uses the Bikram Sambat (BS) calendar. This app uses a custom JS utility (`src/utils/calendar.js`) for BS month names and day counts. BS dates are stored as strings (`YYYY-MM-DD`) alongside the Gregorian equivalent for display.

Current year: **2082 BS** ≈ 2025/2026 AD

---

## Future Roadmap

- [ ] Push notifications (Firebase FCM)
- [ ] Real-time messaging (WebSockets)
- [ ] Native mobile app (React Native)
- [ ] PDF report export (marksheets, attendance reports)
- [ ] Automated fee generation by term
- [ ] Student promotion to next class/grade
- [ ] Multi-campus support
- [ ] Analytics dashboard





