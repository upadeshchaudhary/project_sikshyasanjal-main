// backend/seeder.js
// ════════════════════════════════════════════════════════════════════════════════
// SikshyaSanjal Demo Data Seeder (Single-Tenant)
// Run: node seeder.js           → seeds demo data
// Run: node seeder.js --destroy → wipes all data and exits
// ════════════════════════════════════════════════════════════════════════════════

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// ── Models ───────────────────────────────────────────────────────────────────
const School           = require("../models/SchoolSchema");
const User             = require("../models/UserSchema");
const Student          = require("../models/StudentSchema");
const Homework         = require("../models/HomeworkSchema");
const Notice           = require("../models/NoticeSchema");
const Attendance       = require("../models/AttendanceSchema");
const ExamResult       = require("../models/ExamResultSchema");
const FeeRecord        = require("../models/FeeRecordSchema");
const Message          = require("../models/MessageSchema");
const ClassRoutine     = require("../models/ClassRoutineSchema");
const AcademicCalendar = require("../models/AcademicCalendarSchema");
const { getCurrentAcademicYear } = require("../utils/calendar");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sikshyasanjal";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function hash(password) {
  return bcrypt.hash(password, 12);
}

function adDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function bsDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Grade Calculator ──────────────────────────────────────────────────────────
function calcGrade(pct) {
  if (pct >= 90) return { grade: "A+", gpa: 4.0 };
  if (pct >= 80) return { grade: "A",  gpa: 3.6 };
  if (pct >= 70) return { grade: "B+", gpa: 3.2 };
  if (pct >= 60) return { grade: "B",  gpa: 2.8 };
  if (pct >= 50) return { grade: "C+", gpa: 2.4 };
  if (pct >= 40) return { grade: "C",  gpa: 2.0 };
  if (pct >= 35) return { grade: "D",  gpa: 1.6 };
  return              { grade: "NG",  gpa: 0.0 };
}

function buildSubjects(subjectList, seed = 1) {
  let totalObtained = 0, totalFull = 0;
  const subjects = subjectList.map((name, i) => {
    const full     = 100;
    const obtained = Math.min(100, Math.max(20, Math.floor(55 + ((seed * (i + 3)) % 40))));
    const pct      = Math.round((obtained / full) * 100);
    const { grade, gpa } = calcGrade(pct);
    totalObtained += obtained;
    totalFull     += full;
    return {
      subject:      name,
      marksObtained: obtained,
      fullMarks:    full,
      percentage:   pct,
      grade,
      gpa,
      isPassing:    pct >= 35,
    };
  });
  const overallPct = Math.round((totalObtained / totalFull) * 100);
  const { grade: oGrade, gpa: oGpa } = calcGrade(overallPct);
  return {
    subjects,
    totalMarks:        totalObtained,
    totalFullMarks:    totalFull,
    overallPercentage: overallPct,
    overallGrade:      oGrade,
    overallGpa:        oGpa,
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN SEEDER
// ════════════════════════════════════════════════════════════════════════════════
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ── Wipe existing data ───────────────────────────────────────────────────────
    const collections = [
      School, User, Student, Homework, Notice,
      Attendance, ExamResult, FeeRecord, Message,
      ClassRoutine, AcademicCalendar,
    ];
    await Promise.all(collections.map(M => M.deleteMany({})));
    console.log("🗑️  Cleared existing data");

    if (process.argv.includes("--destroy")) {
      console.log("💥 Destroy flag set — data cleared, exiting.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 1. SCHOOL
    // ════════════════════════════════════════════════════════════════════════════
    const school = await School.create({
      name:         "Saraswati Secondary School",
      address:      "Dharan-5, Sunsari, Koshi Province",
      phone:        "025520123",
      email:        "info@saraswati.edu.np",
      academicYear: getCurrentAcademicYear(),
      classes:      ["9A", "9B", "10A", "10B"],
      subjects:     [
        "English", "Nepali", "Maths", "Science",
        "Social Studies", "Computer", "Health",
        "Optional Maths", "Account", "Economics",
      ],
      estYear:  2041,
    });
    console.log(`🏫 School created: ${school.name}`);

    // ════════════════════════════════════════════════════════════════════════════
    // 2. USERS — Admin
    // ════════════════════════════════════════════════════════════════════════════
    const admin = await User.create({
      name:         "Ramesh Sharma",
      role:         "admin",
      email:        "admin@saraswati.edu.np",
      passwordHash: await hash("Admin@123"),
      isDisabled:   false,
      lastLogin:    new Date(),
    });
    console.log(`👨‍💼 Admin created: ${admin.name} | admin@saraswati.edu.np | Admin@123`);

    // ════════════════════════════════════════════════════════════════════════════
    // 3. USERS — Teachers
    // ════════════════════════════════════════════════════════════════════════════
    const teacherData = [
      { name: "Sunita Koirala",    subject: "English",        classes: ["9A","9B","10A","10B"], email: "sunita@saraswati.edu.np",  q: "M.A. English",       phone: "9841234501" },
      { name: "Ram Bahadur Rai",   subject: "Maths",          classes: ["10A","10B"],           email: "ram@saraswati.edu.np",     q: "M.Sc. Mathematics",  phone: "9841234502" },
      { name: "Sita Thapa",        subject: "Science",        classes: ["9A","9B"],             email: "sita@saraswati.edu.np",    q: "M.Sc. Physics",      phone: "9841234503" },
      { name: "Bikash Limbu",      subject: "Social Studies", classes: ["9A","10A"],            email: "bikash@saraswati.edu.np",  q: "M.A. History",       phone: "9841234504" },
      { name: "Kabita Gurung",     subject: "Nepali",         classes: ["9B","10B"],            email: "kabita@saraswati.edu.np",  q: "M.A. Nepali",        phone: "9841234505" },
      { name: "Arjun Shrestha",    subject: "Computer",       classes: ["9A","9B","10A","10B"], email: "arjun@saraswati.edu.np",   q: "B.E. Computer",      phone: "9841234506" },
      { name: "Gita Bhattarai",    subject: "Account",        classes: ["10A","10B"],           email: "gita@saraswati.edu.np",    q: "M.B.S. Accounting",  phone: "9841234507" },
      { name: "Pawan Tamang",      subject: "Optional Maths", classes: ["10A","10B"],           email: "pawan@saraswati.edu.np",   q: "M.Sc. Maths",        phone: "9841234508" },
      { name: "Mina Rai",          subject: "Health",         classes: ["9A","9B"],             email: "mina@saraswati.edu.np",    q: "B.Sc. Nursing",      phone: "9841234509" },
      { name: "Deepak Karki",      subject: "English",        classes: ["10A","10B"],           email: "deepak@saraswati.edu.np",  q: "B.Ed. English",      phone: "9841234510" },
    ];

    const teacherHashes = await Promise.all(teacherData.map(() => hash("Teacher@123")));

    const teachers = await Promise.all(
      teacherData.map((t, i) =>
        User.create({
          name:            t.name,
          role:            "teacher",
          email:           t.email,
          passwordHash:    teacherHashes[i],  
          subject:         t.subject,
          assignedClasses: t.classes,
          qualification:   t.q,
          phone:           t.phone,
          isDisabled:      false,
        })
      )
    );
    console.log(`👩‍🏫 ${teachers.length} teachers created | Password: Teacher@123`);

    const [sunita, ram, sita, bikash, kabita, arjun, gita, pawan, mina, deepak] = teachers;

    // ════════════════════════════════════════════════════════════════════════════
    // 4. STUDENTS — 10 per class (40 total)
    // ════════════════════════════════════════════════════════════════════════════
    const studentData = [
      { name: "Aarav Sharma",     class: "9A",  rollNo: 1,  gender: "male",   parentName: "Rajesh Sharma",   parentPhone: "9841111101", dobBs: "2066-03-12", admissionYear: "2079" },
      { name: "Priya Thapa",      class: "9A",  rollNo: 2,  gender: "female", parentName: "Kiran Thapa",     parentPhone: "9841111102", dobBs: "2066-05-20", admissionYear: "2079" },
      { name: "Rohan Gurung",     class: "9A",  rollNo: 3,  gender: "male",   parentName: "Dhan Gurung",     parentPhone: "9841111103", dobBs: "2066-02-08", admissionYear: "2079" },
      { name: "Samiksha Rai",     class: "9A",  rollNo: 4,  gender: "female", parentName: "Hari Rai",        parentPhone: "9841111104", dobBs: "2066-07-15", admissionYear: "2079" },
      { name: "Dipesh Limbu",     class: "9A",  rollNo: 5,  gender: "male",   parentName: "Man Limbu",       parentPhone: "9841111105", dobBs: "2066-09-03", admissionYear: "2079" },
      { name: "Anisha Koirala",   class: "9A",  rollNo: 6,  gender: "female", parentName: "Shyam Koirala",   parentPhone: "9841111106", dobBs: "2066-01-25", admissionYear: "2079" },
      { name: "Suresh Karki",     class: "9A",  rollNo: 7,  gender: "male",   parentName: "Gopal Karki",     parentPhone: "9841111107", dobBs: "2066-11-17", admissionYear: "2079" },
      { name: "Nisha Magar",      class: "9A",  rollNo: 8,  gender: "female", parentName: "Bir Magar",       parentPhone: "9841111108", dobBs: "2066-04-29", admissionYear: "2079" },
      { name: "Prabin Yadav",     class: "9A",  rollNo: 9,  gender: "male",   parentName: "Laxman Yadav",    parentPhone: "9841111109", dobBs: "2066-08-11", admissionYear: "2079" },
      { name: "Kriti Subedi",     class: "9A",  rollNo: 10, gender: "female", parentName: "Tek Subedi",      parentPhone: "9841111110", dobBs: "2066-06-22", admissionYear: "2079" },
      { name: "Aakash Tamang",    class: "9B",  rollNo: 1,  gender: "male",   parentName: "Ram Tamang",      parentPhone: "9841111201", dobBs: "2066-02-14", admissionYear: "2079" },
      { name: "Sunita Rai",       class: "9B",  rollNo: 2,  gender: "female", parentName: "Karna Rai",       parentPhone: "9841111202", dobBs: "2066-10-08", admissionYear: "2079" },
      { name: "Bikram Bhattarai", class: "9B",  rollNo: 3,  gender: "male",   parentName: "Mohan Bhattarai", parentPhone: "9841111203", dobBs: "2066-12-19", admissionYear: "2079" },
      { name: "Puja Shrestha",    class: "9B",  rollNo: 4,  gender: "female", parentName: "Dinesh Shrestha", parentPhone: "9841111204", dobBs: "2066-03-30", admissionYear: "2079" },
      { name: "Manish Ghimire",   class: "9B",  rollNo: 5,  gender: "male",   parentName: "Surya Ghimire",   parentPhone: "9841111205", dobBs: "2066-07-22", admissionYear: "2079" },
      { name: "Sujata Bhandari",  class: "9B",  rollNo: 6,  gender: "female", parentName: "Lok Bhandari",    parentPhone: "9841111206", dobBs: "2066-05-05", admissionYear: "2079" },
      { name: "Nabin Upreti",     class: "9B",  rollNo: 7,  gender: "male",   parentName: "Ganesh Upreti",   parentPhone: "9841111207", dobBs: "2066-01-16", admissionYear: "2079" },
      { name: "Kabita Paudel",    class: "9B",  rollNo: 8,  gender: "female", parentName: "Tika Paudel",     parentPhone: "9841111208", dobBs: "2066-09-28", admissionYear: "2079" },
      { name: "Sagar Adhikari",   class: "9B",  rollNo: 9,  gender: "male",   parentName: "Hari Adhikari",   parentPhone: "9841111209", dobBs: "2066-11-11", admissionYear: "2079" },
      { name: "Rupa Chaudhary",   class: "9B",  rollNo: 10, gender: "female", parentName: "Devi Chaudhary",  parentPhone: "9841111210", dobBs: "2066-06-03", admissionYear: "2079" },
      { name: "Arjun Pokharel",   class: "10A", rollNo: 1,  gender: "male",   parentName: "Bishnu Pokharel", parentPhone: "9841111301", dobBs: "2065-03-18", admissionYear: "2078" },
      { name: "Binita Regmi",     class: "10A", rollNo: 2,  gender: "female", parentName: "Lila Regmi",      parentPhone: "9841111302", dobBs: "2065-07-24", admissionYear: "2078" },
      { name: "Sanjay Budhathoki",class: "10A", rollNo: 3,  gender: "male",   parentName: "Jay Budhathoki",  parentPhone: "9841111303", dobBs: "2065-01-09", admissionYear: "2078" },
      { name: "Rekha Pandey",     class: "10A", rollNo: 4,  gender: "female", parentName: "Nava Pandey",     parentPhone: "9841111304", dobBs: "2065-10-31", admissionYear: "2078" },
      { name: "Anil Dahal",       class: "10A", rollNo: 5,  gender: "male",   parentName: "Kedar Dahal",     parentPhone: "9841111305", dobBs: "2065-05-13", admissionYear: "2078" },
      { name: "Poonam Dhakal",    class: "10A", rollNo: 6,  gender: "female", parentName: "Nim Dhakal",      parentPhone: "9841111306", dobBs: "2065-08-26", admissionYear: "2078" },
      { name: "Rajan Giri",       class: "10A", rollNo: 7,  gender: "male",   parentName: "Kumar Giri",      parentPhone: "9841111307", dobBs: "2065-02-07", admissionYear: "2078" },
      { name: "Aarti Sapkota",    class: "10A", rollNo: 8,  gender: "female", parentName: "Madan Sapkota",   parentPhone: "9841111308", dobBs: "2065-11-19", admissionYear: "2078" },
      { name: "Naresh Mahato",    class: "10A", rollNo: 9,  gender: "male",   parentName: "Budhi Mahato",    parentPhone: "9841111309", dobBs: "2065-04-02", admissionYear: "2078" },
      { name: "Sushila Chettri",  class: "10A", rollNo: 10, gender: "female", parentName: "Dhan Chettri",    parentPhone: "9841111310", dobBs: "2065-09-14", admissionYear: "2078" },
      { name: "Prakash Khatri",   class: "10B", rollNo: 1,  gender: "male",   parentName: "Purna Khatri",    parentPhone: "9841111401", dobBs: "2065-06-21", admissionYear: "2078" },
      { name: "Sabita Joshi",     class: "10B", rollNo: 2,  gender: "female", parentName: "Dilli Joshi",     parentPhone: "9841111402", dobBs: "2065-12-04", admissionYear: "2078" },
      { name: "Suraj Basnet",     class: "10B", rollNo: 3,  gender: "male",   parentName: "Ram Basnet",      parentPhone: "9841111403", dobBs: "2065-03-27", admissionYear: "2078" },
      { name: "Kumari Rijal",     class: "10B", rollNo: 4,  gender: "female", parentName: "Shiva Rijal",     parentPhone: "9841111404", dobBs: "2065-08-08", admissionYear: "2078" },
      { name: "Binod Khadka",     class: "10B", rollNo: 5,  gender: "male",   parentName: "Dhan Khadka",     parentPhone: "9841111405", dobBs: "2065-01-15", admissionYear: "2078" },
      { name: "Alisha Neupane",   class: "10B", rollNo: 6,  gender: "female", parentName: "Bal Neupane",     parentPhone: "9841111406", dobBs: "2065-05-29", admissionYear: "2078" },
      { name: "Rohit Tamrakar",   class: "10B", rollNo: 7,  gender: "male",   parentName: "Kiran Tamrakar",  parentPhone: "9841111407", dobBs: "2065-10-10", admissionYear: "2078" },
      { name: "Jamuna Acharya",   class: "10B", rollNo: 8,  gender: "female", parentName: "Tek Acharya",     parentPhone: "9841111408", dobBs: "2065-02-22", admissionYear: "2078" },
      { name: "Kiran Panta",      class: "10B", rollNo: 9,  gender: "male",   parentName: "Ram Panta",       parentPhone: "9841111409", dobBs: "2065-07-06", admissionYear: "2078" },
      { name: "Sabina Gautam",    class: "10B", rollNo: 10, gender: "female", parentName: "Bal Gautam",      parentPhone: "9841111410", dobBs: "2065-11-18", admissionYear: "2078" },
    ];

    const students = await Student.insertMany(
      studentData.map(s => ({ ...s, isActive: true }))
    );
    console.log(`👩‍🎓 ${students.length} students created`);

    // ════════════════════════════════════════════════════════════════════════════
    // 5. PARENT USERS
    // ════════════════════════════════════════════════════════════════════════════
    const parentDemoData = [
      { name: "Rajesh Sharma",   phone: "9841111101", child: students[0]  },
      { name: "Ram Tamang",      phone: "9841111201", child: students[10] },
      { name: "Bishnu Pokharel", phone: "9841111301", child: students[20] },
      { name: "Purna Khatri",    phone: "9841111401", child: students[30] },
    ];

    const parentHashes = await Promise.all(parentDemoData.map(() => hash("Parent@123")));

    const parents = await Promise.all(
      parentDemoData.map((p, i) =>
        User.create({
          name:         p.name,
          role:         "parent",
          phone:        p.phone,
          passwordHash: parentHashes[i],
          childId:      p.child._id,
          childName:    p.child.name,
          childClass:   p.child.class,
          isDisabled:   false,
        })
      )
    );
    console.log(`👪 ${parents.length} demo parent accounts created | Password: Parent@123`);

    await Promise.all(
      parentDemoData.map((p, i) =>
        Student.findByIdAndUpdate(p.child._id, { parentId: parents[i]._id })
      )
    );

    const [parent9A, parent9B, parent10A, parent10B] = parents;

    // ════════════════════════════════════════════════════════════════════════════
    // 6. HOMEWORK
    // ════════════════════════════════════════════════════════════════════════════
    const homeworkData = [
      { title: "Quadratic Equations Exercise",  subject: "Maths",          class: "10A", priority: "high",   postedBy: ram._id,    dueDate: adDate(2025,5,10), dueDateBs: bsDate(2082,1,27), description: "Complete exercises 5.1 to 5.4 from the textbook." },
      { title: "Essay on Climate Change",       subject: "English",        class: "10A", priority: "medium", postedBy: sunita._id, dueDate: adDate(2025,5,12), dueDateBs: bsDate(2082,1,29), description: "Write a 500-word essay on the impacts of climate change in Nepal." },
      { title: "Light and Optics Problems",     subject: "Science",        class: "9A",  priority: "high",   postedBy: sita._id,   dueDate: adDate(2025,5,11), dueDateBs: bsDate(2082,1,28), description: "Solve the numericals on refraction from Chapter 12." },
      { title: "Democracy Chapter Questions",   subject: "Social Studies", class: "9A",  priority: "low",    postedBy: bikash._id, dueDate: adDate(2025,5,15), dueDateBs: bsDate(2082,2,2),  description: "Answer all questions from Chapter 3 on democracy." },
      { title: "Python Programming Assignment", subject: "Computer",       class: "10A", priority: "high",   postedBy: arjun._id,  dueDate: adDate(2025,5,8),  dueDateBs: bsDate(2082,1,25), description: "Write a program to implement a simple calculator." },
      { title: "Accounting Journal Entries",    subject: "Account",        class: "10A", priority: "medium", postedBy: gita._id,   dueDate: adDate(2025,5,13), dueDateBs: bsDate(2082,1,30), description: "Complete journal entries for the given 20 transactions." },
      { title: "कविता पाठ र प्रश्नहरू",         subject: "Nepali",         class: "9B",  priority: "medium", postedBy: kabita._id, dueDate: adDate(2025,5,10), dueDateBs: bsDate(2082,1,27), description: "पाठ्यपुस्तकको अध्याय ७ पढ्ने र प्रश्नोत्तर लेख्ने।" },
      { title: "Optional Maths Integration",    subject: "Optional Maths", class: "10B", priority: "high",   postedBy: pawan._id,  dueDate: adDate(2025,5,9),  dueDateBs: bsDate(2082,1,26), description: "Practice integration problems from Exercise 8.2." },
      { title: "Health and Nutrition Report",   subject: "Health",         class: "9A",  priority: "low",    postedBy: mina._id,   dueDate: adDate(2025,5,16), dueDateBs: bsDate(2082,2,3),  description: "Prepare a one-page report on balanced diet." },
      { title: "Letter Writing Practice",       subject: "English",        class: "10B", priority: "medium", postedBy: deepak._id, dueDate: adDate(2025,5,11), dueDateBs: bsDate(2082,1,28), description: "Write a formal letter applying for a job." },
    ];

    await Homework.insertMany(homeworkData);
    console.log(`📝 ${homeworkData.length} homework assignments created`);

    // ════════════════════════════════════════════════════════════════════════════
    // 7. NOTICES
    // ════════════════════════════════════════════════════════════════════════════
    const noticeData = [
      { title: "Half-Yearly Examination Schedule 2082", body: "The half-yearly examinations will be held from Jestha 15 to Jestha 25, 2082 BS. Students are advised to prepare accordingly. Detailed schedule available on the notice board.", category: "exam",    isImportant: true,  postedBy: admin._id,  targetRoles: ["admin","teacher","parent"] },
      { title: "School Closed for Dashain Holidays",    body: "The school will be closed from Asoj 25 to Kartik 5, 2082 BS for the Dashain festival. All students and staff are wished a happy Dashain.",                                  category: "holiday", isImportant: true,  postedBy: admin._id,  targetRoles: ["admin","teacher","parent"] },
      { title: "Parent-Teacher Meeting - 10th Grade",   body: "A parent-teacher meeting for Class 10 students is scheduled for Baisakh 30, 2082 BS at 10:00 AM in the school hall. Attendance of all parents is mandatory.",             category: "meeting", isImportant: true,  postedBy: admin._id,  targetRoles: ["admin","teacher","parent"] },
      { title: "Annual Sports Day Announcement",        body: "The Annual Sports Day will be held on Jestha 5, 2082 BS. Students are encouraged to participate in various events. Registration open until Baisakh 28.",                    category: "event",   isImportant: false, postedBy: sunita._id, targetRoles: ["admin","teacher","parent"] },
      { title: "Library Books Submission Deadline",     body: "All borrowed library books must be returned by Baisakh 30, 2082 BS. Fine of NPR 5 per day will be charged for late returns.",                                              category: "urgent",  isImportant: false, postedBy: admin._id,  targetRoles: ["admin","teacher","parent"] },
      { title: "Science Exhibition Registration Open",  body: "Students interested in participating in the Inter-School Science Exhibition should register with their class teacher by Baisakh 25. Only three students per class will be selected.", category: "event", isImportant: false, postedBy: sita._id, targetRoles: ["admin","teacher","parent"] },
      { title: "New Computer Lab Inauguration",         body: "The new computer lab with 30 workstations will be inaugurated on Baisakh 20, 2082 BS. Students of Class 9 and 10 will have priority access.",                             category: "event",   isImportant: false, postedBy: admin._id,  targetRoles: ["admin","teacher","parent"] },
      { title: "Fee Payment Reminder",                  body: "Second term fees are due by the end of Baisakh 2082. Parents who have not paid are requested to do so immediately to avoid late fees.",                                     category: "urgent",  isImportant: true,  postedBy: admin._id,  targetRoles: ["admin","teacher","parent"] },
    ];

    await Notice.insertMany(noticeData);
    console.log(`📣 ${noticeData.length} notices created`);

    // ════════════════════════════════════════════════════════════════════════════
    // 8. ATTENDANCE
    // ════════════════════════════════════════════════════════════════════════════
    const attRecords = [];
    const today = new Date();

    for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - daysAgo);
      d.setUTCHours(0, 0, 0, 0);
      if (d.getUTCDay() === 6) continue;
      const bsStr = bsDate(2082, d.getUTCMonth() + 1, d.getUTCDate());

      for (const student of students) {
        const r = (student.rollNo * (daysAgo + 1) * 7) % 100;
        let status = r < 85 ? "present" : r < 92 ? "absent" : r < 97 ? "late" : "excused";
        const classTeacher = teachers.find(t => t.assignedClasses?.includes(student.class));

        attRecords.push({
          student:  student._id,
          class:    student.class,
          date:     d,
          dateBs:   bsStr,
          status,
          markedBy: classTeacher ? classTeacher._id : admin._id,
        });
      }
    }

    for (let i = 0; i < attRecords.length; i += 500) {
      await Attendance.insertMany(attRecords.slice(i, i + 500));
    }
    console.log(`✅ ${attRecords.length} attendance records created`);

    // ════════════════════════════════════════════════════════════════════════════
    // 9. EXAM RESULTS
    // ════════════════════════════════════════════════════════════════════════════
    const CLASS_SUBJECTS = {
      "9A":  ["English","Nepali","Maths","Science","Social Studies","Computer","Health"],
      "9B":  ["English","Nepali","Maths","Science","Social Studies","Computer","Health"],
      "10A": ["English","Nepali","Maths","Science","Social Studies","Computer","Health","Optional Maths","Account"],
      "10B": ["English","Nepali","Maths","Science","Social Studies","Computer","Health","Optional Maths","Economics"],
    };

    const resultRecords = [];
    for (const student of students) {
      const subjs = CLASS_SUBJECTS[student.class] || [];
      const seed  = student.rollNo * 13 + (student.class.charCodeAt(0) % 10);
      const uploaderTeacher = teachers.find(t => t.assignedClasses?.includes(student.class));
      const uploadedBy = uploaderTeacher ? uploaderTeacher._id : admin._id;

      const ft = buildSubjects(subjs, seed);
      resultRecords.push({
        student:           student._id,
        class:             student.class,
        examName:          "First Term",
        examYear:          "2082",
        subjects:          ft.subjects,
        totalMarks:        ft.totalMarks,
        totalFullMarks:    ft.totalFullMarks,
        overallPercentage: ft.overallPercentage,
        overallGrade:      ft.overallGrade,
        overallGpa:        ft.overallGpa,
        uploadedBy,
        isPublished:       true,
        publishedAt:       adDate(2025, 3, 15),
      });

      const st = buildSubjects(subjs, seed + 7);
      resultRecords.push({
        student:           student._id,
        class:             student.class,
        examName:          "Second Term",
        examYear:          "2082",
        subjects:          st.subjects,
        totalMarks:        st.totalMarks,
        totalFullMarks:    st.totalFullMarks,
        overallPercentage: st.overallPercentage,
        overallGrade:      st.overallGrade,
        overallGpa:        st.overallGpa,
        uploadedBy,
        isPublished:       false,
        publishedAt:       null,
      });
    }

    await ExamResult.insertMany(resultRecords);
    console.log(`🏆 ${resultRecords.length} exam results created`);

    // ════════════════════════════════════════════════════════════════════════════
    // 10. FEE RECORDS
    // ════════════════════════════════════════════════════════════════════════════
    const feeTypes = [
      { feeType: "tuition",  amount: 3500, dueDate: adDate(2025,4,13), dueDateBs: bsDate(2082,1,1)  },
      { feeType: "exam",     amount: 800,  dueDate: adDate(2025,4,25), dueDateBs: bsDate(2082,1,13) },
      { feeType: "sports",   amount: 500,  dueDate: adDate(2025,4,13), dueDateBs: bsDate(2082,1,1)  },
    ];

    const feeRecords = [];
    for (const student of students) {
      for (const ft of feeTypes) {
        const r = (student.rollNo * 11) % 10;
        let status = r < 6 ? "paid" : r < 8 ? "partially_paid" : "pending";
        let paidAmount = status === "paid" ? ft.amount : status === "partially_paid" ? Math.floor(ft.amount / 2) : 0;

        feeRecords.push({
          student:       student._id,
          class:         student.class,
          feeType:       ft.feeType,
          amount:        ft.amount,
          paidAmount,
          status,
          dueDate:       ft.dueDate,
          dueDateBs:     ft.dueDateBs,
          paidDate:      paidAmount > 0 ? adDate(2025, 4, 10) : null,
          paidDateBs:    paidAmount > 0 ? bsDate(2082, 12, 27) : null,
          paymentMethod: paidAmount > 0 ? (r < 3 ? "cash" : "esewa") : null,
          academicYear:  getCurrentAcademicYear(),
          recordedBy:    admin._id,
        });
      }
    }

    await FeeRecord.insertMany(feeRecords);
    console.log(`💳 ${feeRecords.length} fee records created`);

    // ════════════════════════════════════════════════════════════════════════════
    // 11. MESSAGES
    // ════════════════════════════════════════════════════════════════════════════
    const msg1 = await Message.create({
      from:              parent9A._id,
      to:                sunita._id,
      subject:           "Regarding Aarav's English homework",
      body:              "Namaste Ma'am, I wanted to ask about Aarav's recent essay assignment. He is finding the topic a bit difficult. Could you please provide some additional guidance?",
      isReadByRecipient: true,
    });

    await Message.create({
      from:              sunita._id,
      to:                parent9A._id,
      subject:           "Re: Regarding Aarav's English homework",
      body:              "Namaste, Thank you for reaching out. Aarav is doing well overall. For the essay, I suggest he reads the reference material I shared in class.",
      parentMsg:         msg1._id,
      isReadByRecipient: false,
    });
    console.log("💬 Demo messages created");

    // ════════════════════════════════════════════════════════════════════════════
    // 12. CLASS ROUTINE
    // ════════════════════════════════════════════════════════════════════════════
    const buildDay = (schedule) => {
      let currentTime = 9 * 60;
      return Array.from({ length: 8 }, (_, i) => {
        const periodNo = i + 1;
        const isBreak = periodNo === 5;
        const duration = isBreak ? 30 : 45;
        const start = currentTime;
        const end = currentTime + duration;
        currentTime = end;
        const format = (m) => `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`;
        
        if (isBreak) return { periodNo, startTime: format(start), endTime: format(end), isBreak: true, subject: "", teacher: "" };
        const slot = schedule.shift() || { subject: "Free", teacher: "" };
        const tObj = teachers.find(t => t.name === slot.teacher);
        return { periodNo, startTime: format(start), endTime: format(end), isBreak: false, subject: slot.subject, teacher: slot.teacher, teacherId: tObj?._id, room: slot.room || "" };
      });
    };

    await ClassRoutine.create({
      class: "10A",
      classTeacher: sunita._id,
      academicYear: getCurrentAcademicYear(),
      monday:    buildDay([{ subject: "English", teacher: "Sunita Koirala", room: "101" }, { subject: "Maths", teacher: "Ram Bahadur Rai" }, { subject: "Science", teacher: "Sita Thapa" }, { subject: "Computer", teacher: "Arjun Shrestha" }, { subject: "Social Studies", teacher: "Bikash Limbu" }, { subject: "Nepali", teacher: "Kabita Gurung" }, { subject: "Account", teacher: "Gita Bhattarai" }]),
      tuesday:   buildDay([{ subject: "English", teacher: "Sunita Koirala" }, { subject: "Maths", teacher: "Ram Bahadur Rai" }, { subject: "Account", teacher: "Gita Bhattarai" }, { subject: "Nepali", teacher: "Kabita Gurung" }, { subject: "Computer", teacher: "Arjun Shrestha" }, { subject: "Science", teacher: "Sita Thapa" }, { subject: "Social Studies", teacher: "Bikash Limbu" }]),
      wednesday: buildDay([{ subject: "English", teacher: "Sunita Koirala" }, { subject: "Science", teacher: "Sita Thapa" }, { subject: "Maths", teacher: "Ram Bahadur Rai" }, { subject: "Account", teacher: "Gita Bhattarai" }, { subject: "English", teacher: "Sunita Koirala" }, { subject: "Optional Maths", teacher: "Pawan Tamang" }, { subject: "Computer", teacher: "Arjun Shrestha" }]),
      thursday:  buildDay([{ subject: "English", teacher: "Sunita Koirala" }, { subject: "Account", teacher: "Gita Bhattarai" }, { subject: "Science", teacher: "Sita Thapa" }, { subject: "Optional Maths", teacher: "Pawan Tamang" }, { subject: "Maths", teacher: "Ram Bahadur Rai" }, { subject: "Nepali", teacher: "Kabita Gurung" }, { subject: "Health", teacher: "Mina Rai" }]),
      friday:    buildDay([{ subject: "English", teacher: "Sunita Koirala" }, { subject: "Social Studies", teacher: "Bikash Limbu" }, { subject: "Optional Maths", teacher: "Pawan Tamang" }, { subject: "Maths", teacher: "Ram Bahadur Rai" }, { subject: "Nepali", teacher: "Kabita Gurung" }, { subject: "Account", teacher: "Gita Bhattarai" }, { subject: "Science", teacher: "Sita Thapa" }]),
      updatedBy: admin._id,
    });
    console.log("📅 Routine created");

    // ════════════════════════════════════════════════════════════════════════════
    // 13. ACADEMIC CALENDAR
    // ════════════════════════════════════════════════════════════════════════════
    const calendarEvents = [
      { title: "New Academic Year Begins", type: "event", startDate: adDate(2025,4,14), startDateBs: bsDate(2082,1,1), isHoliday: false },
      { title: "Ram Navami", type: "holiday", startDate: adDate(2025,4,6), startDateBs: bsDate(2081,12,24), isHoliday: true },
      { title: "Mid-Term Examination", type: "exam", startDate: adDate(2025,4,28), startDateBs: bsDate(2082,1,15), isHoliday: false },
    ];

    await AcademicCalendar.insertMany(
      calendarEvents.map(e => ({ ...e, academicYear: getCurrentAcademicYear(), createdBy: admin._id }))
    );
    console.log(`📆 Calendar events created`);

    console.log("\n✅ SEEDING COMPLETE");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
