# SikshyaSanjal Backend — Single-Tenant School Management System

A clean, production-ready **MERN stack** backend for managing school operations. Single-tenant architecture, role-based access control (Admin, Teacher, Parent), and Bikram Sambat calendar integration.

---

## ✨ Features

- **Three User Roles**: Admin, Teacher, Parent — each with tailored dashboards and permissions
- **No Google OAuth**: Email + password for admin/teacher; OTP-based SMS login for parents
- **Single-Tenant**: One school instance per deployment; no school domain switching
- **Multi-tenancy Removed**: All school-scoping cleaned out; models simplified
- **Role-Based Access Control**: Enforced at middleware level
- **Bikram Sambat Calendar**: Native BS date support for Nepali schools
- **Encrypted Parent-Teacher Messaging**: AES-256-GCM encryption for message content
- **Secure JWT Authentication**: 7-day token expiry, refresh strategy ready
- **Data Integrity**: Unique indexes, validators, cascading logic in pre-save hooks
- **Clean Code**: Refactored controllers, no unnecessary duplication, consistent error handling

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js | JavaScript server |
| **Framework** | Express 4.18 | REST API server |
| **Database** | MongoDB | Document store |
| **ODM** | Mongoose 8.0 | Schema & validation |
| **Auth** | JWT + bcryptjs | Session & password security |
| **Encryption** | crypto (Node.js native) | Message encryption |
| **Logging** | Morgan | HTTP request logging |
| **Security** | Helmet, express-rate-limit | HTTP headers, DDoS protection |
| **Rate Limiting** | express-rate-limit | OTP & login abuse prevention |

---

## 📦 Installation

### Prerequisites

- **Node.js** ≥ 16, **npm** ≥ 8
- **MongoDB** (local or Atlas)
- `.env` file with credentials

### Setup

1. **Clone and install**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI, JWT secret, etc.
   ```

3. **Start development server**:
   ```bash
   npm run dev   # with nodemon
   # or
   npm start     # production
   ```

4. **(Optional) Seed demo data**:
   ```bash
   npm run seed
   ```

The API is now running at `http://localhost:5000`.

---

## 🏗 Project Structure

```
backend/
├── server.js                      # Express app initialization
├── package.json                   # Dependencies
├── .env.example                   # Config template
│
├── middleware/
│   └── authMiddleware.js          # JWT validation, role guards
│
├── models/
│   ├── UserSchema.js              # Admin, Teacher, Parent users
│   ├── StudentSchema.js           # Student records
│   ├── AttendanceSchema.js        # Daily attendance
│   ├── ClassRoutineSchema.js      # Weekly timetables
│   ├── ExamResultSchema.js        # Marks & grades
│   ├── FeeRecordSchema.js         # Payment tracking
│   ├── HomeworkSchema.js          # Assignment posting
│   ├── MessageSchema.js           # Parent-teacher messaging
│   ├── NoticeSchema.js            # School announcements
│   ├── AcademicCalendarSchema.js  # BS-based events
│   ├── ComplainSchema.js          # User complaints
│   ├── SchoolSchema.js            # Single school config
│   └── index.js                   # Export all models
│
├── controllers/
│   ├── auth/authController.js           # Login, OTP, JWT
│   ├── attendance/attendanceController.js   # Attendance marking
│   ├── calendar/calendarController.js       # Calendar CRUD
│   ├── complain/complainController.js       # Complaints
│   ├── dashboard/dashboardController.js     # Stats & search
│   ├── fees/feesController.js              # Fee tracking
│   ├── homework/homeworkController.js      # Homework CRUD
│   ├── messages/messagesController.js      # Messaging
│   ├── notices/noticesController.js        # Notices
│   ├── results/resultsController.js        # Exam results
│   ├── routine/routineController.js        # Timetable generation
│   ├── search/searchController.js          # Global search
│   ├── settings/settingsController.js      # School config
│   ├── students/studentsController.js      # Student CRUD
│   └── teachers/teachersController.js      # Teacher CRUD
│
├── routes/
│   ├── auth/authRoutes.js
│   ├── attendance/attendanceRoutes.js
│   ├── calendar/calendarRoutes.js
│   ├── complain/complainRoutes.js
│   ├── dashboard/dashboardRoutes.js
│   ├── fees/feesRoutes.js
│   ├── homework/homeworkRoutes.js
│   ├── messages/messagesRoutes.js
│   ├── notices/noticesRoutes.js
│   ├── results/resultsRoutes.js
│   ├── routine/routineRoutes.js
│   ├── search/searchRoutes.js
│   ├── settings/settingsRoutes.js
│   ├── students/studentsRoutes.js
│   └── teachers/teachersRoutes.js
│
└── utils/
    ├── messageCrypto.js           # AES-256-GCM encryption
    └── calendar.js                # BS ↔ AD conversion
```

---

## 🔐 Authentication Flow

### Admin / Teacher
```
POST /api/auth/login
  → email + password
  → validate user, check role
  → return JWT { userId, role } + user shape
```

### Parent (OTP-Based)
```
1. POST /api/auth/parent/send-otp
   → phone number
   → generate 6-digit OTP
   → log to console (dev) or send via SMS (prod)

2. POST /api/auth/parent/verify-otp
   → phone + OTP
   → verify hash, check expiry (5 min)
   → return JWT + user shape

3. POST /api/auth/parent/login (password fallback)
   → phone + password
   → if set, authenticate
   → return JWT
```

### Session Restoration
```
GET /api/auth/me
  → Authorization: Bearer <token>
  → validate JWT
  → return current user + school info
```

---

## 📊 Database Models

### User (Admin, Teacher, Parent)
- **Admin**: Full system access, configuration, teacher management
- **Teacher**: Class management, attendance, homework, messaging
- **Parent**: View-only access to child's data; messaging teachers

```javascript
{
  name, email, phone, role, passwordHash, otpHash, otpExpiry,
  subject (teachers), assignedClasses, qualification,
  childId, childName, childClass (parents),
  avatar, isDisabled, lastLogin, timestamps
}
```

### Key Models (Simplified, No `school` Field)
- **Student**: name, rollNo, class, dob, gender, parent info
- **Attendance**: student, class, date, dateBs, status, note
- **ClassRoutine**: class, classTeacher, monday–friday schedules, subjectTeacherMap
- **Homework**: title, subject, class, dueDate, priority, postedBy
- **Message**: from, to, body (encrypted), subject, parentMsg (for threading)
- **Notice**: title, body, category, isImportant, targetRoles, expiresAt
- **FeeRecord**: student, class, feeType, amount, paidAmount, status, dueDate
- **ExamResult**: student, class, examName, subjects (with grades/GPA), publishedAt

---

## 🔌 API Endpoints

### Auth
```
GET    /api/auth/school                              # Get school info
POST   /api/auth/login                               # Admin/teacher email+password
POST   /api/auth/parent/send-otp                     # Parent OTP request
POST   /api/auth/parent/verify-otp                   # Parent OTP verification
POST   /api/auth/parent/login                        # Parent password login
GET    /api/auth/me                                  # Current user (requires JWT)
POST   /api/auth/logout                              # Logout (clears client-side token)
```

### Students
```
GET    /api/students                                 # List (filtered by role)
GET    /api/students/classes                         # Classes for role
GET    /api/students/:id                             # Individual
POST   /api/students                                 # Create (admin/teacher)
PUT    /api/students/:id                             # Update (admin/teacher)
DELETE /api/students/:id                             # Deactivate (admin/teacher)
```

### Teachers
```
GET    /api/teachers/me                              # Own profile
GET    /api/teachers                                 # List all
GET    /api/teachers/:id                             # Individual
POST   /api/teachers                                 # Create (admin)
PUT    /api/teachers/me                              # Update own (teacher)
PUT    /api/teachers/:id                             # Update (admin)
PATCH  /api/teachers/:id/assign-classes              # Assign classes (admin)
PATCH  /api/teachers/:id/toggle-status               # Disable/enable (admin)
DELETE /api/teachers/:id                             # Remove (admin)
POST   /api/teachers/:id/force-logout                # Invalidate sessions (admin)
```

### Attendance
```
GET    /api/attendance                               # List (filtered by role)
GET    /api/attendance/today                         # Today's summary
GET    /api/attendance/monthly                       # Monthly calendar
POST   /api/attendance/bulk                          # Bulk mark (teacher/admin)
PUT    /api/attendance/:id                           # Update single (teacher/admin)
```

### Homework
```
GET    /api/homework                                 # List (filtered by role)
GET    /api/homework/:id                             # Individual
POST   /api/homework                                 # Create (teacher/admin)
PUT    /api/homework/:id                             # Update (teacher/admin)
DELETE /api/homework/:id                             # Delete (teacher/admin)
```

### Messages
```
GET    /api/messages/unread-count                    # Unread count
GET    /api/messages/contacts                        # Available recipients
GET    /api/messages                                 # Inbox (paginated)
GET    /api/messages/:id                             # Thread
POST   /api/messages                                 # Send message
PATCH  /api/messages/:id/read                        # Mark as read
PATCH  /api/messages/:id/read-all                    # Mark thread as read
DELETE /api/messages/:id                             # Delete message
```

### Notices
```
GET    /api/notices                                  # List (filtered by role)
GET    /api/notices/important                        # Important only
GET    /api/notices/:id                              # Individual
POST   /api/notices                                  # Create (teacher/admin)
PUT    /api/notices/:id                              # Update (teacher/admin)
DELETE /api/notices/:id                              # Delete (teacher/admin)
```

### Fees
```
GET    /api/fees                                     # List (role-filtered)
GET    /api/fees/summary                             # Admin summary
GET    /api/fees/overdue                             # Overdue list
GET    /api/fees/:id                                 # Individual
POST   /api/fees                                     # Create (admin)
PUT    /api/fees/:id                                 # Update (admin)
DELETE /api/fees/:id                                 # Delete (admin)
```

### Exam Results
```
GET    /api/results                                  # List (role-filtered)
GET    /api/results/:id                              # Individual
POST   /api/results                                  # Upload (teacher/admin)
PUT    /api/results/:id                              # Update (teacher/admin)
PATCH  /api/results/:id/publish                      # Publish (teacher/admin)
PATCH  /api/results/:id/unpublish                    # Unpublish (admin)
DELETE /api/results/:id                              # Delete (teacher/admin)
```

### Class Routine
```
GET    /api/routine                                  # List all
POST   /api/routine/generate                         # Auto-generate (teacher/admin)
GET    /api/routine/:class/subjects                  # Valid subjects for class
GET    /api/routine/:class                           # Read-only view
PUT    /api/routine/:class                           # Update (teacher/admin)
DELETE /api/routine/:class                           # Delete (teacher/admin)
```

### Calendar
```
GET    /api/calendar                                 # List events (filtered by BS year/month)
GET    /api/calendar/upcoming                        # Next 8 events
POST   /api/calendar                                 # Create (admin)
PUT    /api/calendar/:id                             # Update (admin)
DELETE /api/calendar/:id                             # Delete (admin)
```

### Dashboard
```
GET    /api/dashboard/admin                          # Admin stats
GET    /api/dashboard/admin/charts                   # Charts (attendance, enrollment)
GET    /api/dashboard/teacher                        # Teacher overview
GET    /api/dashboard/parent                         # Parent child summary
GET    /api/dashboard/search                         # Global search
```

### Settings
```
GET    /api/settings                                 # School config (admin)
PUT    /api/settings/school                          # Update school (admin)
PUT    /api/settings/profile                         # Update admin profile
GET    /api/settings/stats                           # Quick stats (admin)
```

### Search
```
GET    /api/search?q=searchterm                      # Global search (role-aware)
```

---

## 🔄 Request/Response Examples

### Login (Admin/Teacher)
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "teacher@school.local",
  "password": "securePassword123",
  "role": "teacher"
}

# Response
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "65abc123def456...",
    "name": "Mrs. Sharma",
    "role": "teacher",
    "email": "teacher@school.local",
    "avatar": null
  },
  "school": {
    "_id": "65abc123def456...",
    "name": "Saint Mary's Academy",
    "address": "Kathmandu, Nepal"
  }
}
```

### Send OTP (Parent)
```bash
POST /api/auth/parent/send-otp
Content-Type: application/json

{
  "phone": "9841234567"
}

# Response (development only shows OTP)
{
  "success": true,
  "message": "OTP generated for +977-9841234567. Check the backend console.",
  "demoOtp": "123456"
}
```

### Get Students
```bash
GET /api/students?page=1&limit=20&class=10A&search=Ram
Authorization: Bearer <token>

# Response
{
  "success": true,
  "students": [
    {
      "_id": "65abc123def456...",
      "name": "Ram Kumar",
      "rollNo": 5,
      "class": "10A",
      "dob": "2008-06-15T00:00:00.000Z",
      "gender": "male",
      "parentPhone": "9841234567",
      "parentName": "Hari Kumar"
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
```

---

## 🔐 Security & Best Practices

1. **JWT Tokens**
   - Issued with 7-day expiry; implement refresh token rotation on frontend
   - Never include sensitive data in payload (password, OTP hash, etc.)

2. **OTP Security**
   - 5-minute expiry; hashed with bcrypt (salt 10)
   - Rate-limited: 20 requests per 10 minutes per phone number

3. **Message Encryption**
   - AES-256-GCM with random 16-byte IV per message
   - IV and auth tag stored alongside ciphertext; plaintext never in DB

4. **Password Security**
   - Hashed with bcryptjs (salt 12) before storage
   - Passwords never returned in responses (model.toJSON excludes them)

5. **Role-Based Access Control**
   - Enforced at middleware; every protected route checks `req.user.role`
   - Teachers can only view/edit data for assigned classes
   - Parents can only view their own child's data

6. **Rate Limiting**
   - OTP endpoint: 20 req/10 min
   - Login endpoints: 20 req/15 min
   - Prevents brute force and account enumeration

7. **CORS**
   - Whitelist only your frontend domain in production
   - Credentials must be explicitly allowed

8. **Helmet**
   - Sets secure HTTP headers (CSP, X-Frame-Options, etc.)
   - Prevents clickjacking, XSS, MIME sniffing

---

## 📝 Logging

Morgan logs HTTP requests in combined/dev format:
```
[timestamp] method route status response_time ms - bytes

GET /api/students 200 12.345 ms - 2048
POST /api/attendance/bulk 201 45.678 ms - 1024
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
❌ MongoDB connection failed: connect ECONNREFUSED
```
→ Check MongoDB is running locally (`mongod`) or verify MongoDB Atlas URI

### JWT Token Invalid
```
❌ Invalid authentication token
```
→ Token may be expired; login again. Check `JWT_SECRET` matches between requests

### CORS Error
```
❌ CORS: origin not allowed
```
→ Frontend URL not in `CLIENT_URL` env variable

### OTP Not Showing
```
Development mode: OTP printed to server console
```
→ Check backend logs; OTP expires after 5 minutes

---

## 📚 Architecture Notes

### Single-Tenant Simplification
- **Removed**: `school` field from all schemas, `x-school-domain` header, multi-tenancy middleware
- **Result**: Simplified queries, no scoping filters, models 30-40% smaller
- **Trade-off**: One school per deployment (perfect for this use case)

### Model Validation
- Pre-save hooks validate complex logic (e.g., ClassRoutine period validation)
- Mongoose validators enforce enum/regex at schema level
- Custom error messages guide frontend error handling

### Performance Optimizations
- Compound indexes on high-query fields (e.g., `{ class: 1, date: 1 }` for attendance)
- Lean queries for read-only endpoints (no Mongoose document overhead)
- Pagination on list endpoints (default limit 20, max 100)

---

## 🚀 Deployment

### Environment Variables
1. Generate strong secrets:
   ```bash
   openssl rand -hex 32  # JWT_SECRET
   openssl rand -hex 32  # MESSAGE_ENCRYPTION_KEY
   ```

2. Set on your hosting platform (Render, Railway, DigitalOcean, etc.)

### MongoDB Atlas
1. Create free cluster (512MB storage)
2. Whitelist IP (or allow anywhere in dev)
3. Copy connection string to `MONGO_URI`

### Recommended Hosting
- **Backend**: Render, Railway, DigitalOcean App Platform
- **Database**: MongoDB Atlas (free tier)
- **Frontend**: Vercel, Netlify

### Health Check
```bash
curl http://your-api.com/api/health

{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "env": "production"
}
```

---

## 📄 License

MIT — Open source, free for educational use.

---

## 👥 Support

For questions, bug reports, or contributions, refer to the SikshyaSanjal GitHub repository.

**Last Updated**: January 2025  
**Version**: 1.0.0 (Single-Tenant Refactored)
