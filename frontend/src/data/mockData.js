// ─── Mock school — representing the single tenant school ────────
export const mockSchool = {
  name:    "SikshyaSanjal Academy",
  address: "Kathmandu, Nepal",
  phone:   "+977-1-4567890",
  estYear: 2041,
};

// ─── Students ──────────────────────────────────────────────────────────────────
export const mockStudents = [
  { id:"s1",  rollNo:"001", name:"Aarav Sharma",    class:"10A", parentName:"Rajesh Sharma",  parentPhone:"9841000001", gender:"Male",   address:"Baneshwor, Kathmandu", dob:"2009-04-15" },
  { id:"s2",  rollNo:"002", name:"Priya Thapa",     class:"10A", parentName:"Mohan Thapa",    parentPhone:"9841000002", gender:"Female", address:"Lazimpat, Kathmandu",  dob:"2009-07-22" },
  { id:"s3",  rollNo:"003", name:"Bikash Karki",    class:"10B", parentName:"Sita Karki",     parentPhone:"9841000003", gender:"Male",   address:"Patan, Lalitpur",      dob:"2009-01-10" },
  { id:"s4",  rollNo:"004", name:"Srijana Gurung",  class:"9A",  parentName:"Dhan Gurung",    parentPhone:"9841000004", gender:"Female", address:"Thamel, Kathmandu",    dob:"2010-03-05" },
  { id:"s5",  rollNo:"005", name:"Rohan Pandey",    class:"9A",  parentName:"Hari Pandey",    parentPhone:"9841000005", gender:"Male",   address:"Bhaktapur",            dob:"2010-06-18" },
  { id:"s6",  rollNo:"006", name:"Anjali Rai",      class:"9B",  parentName:"Bishnu Rai",     parentPhone:"9841000006", gender:"Female", address:"Naxal, Kathmandu",     dob:"2010-09-27" },
  { id:"s7",  rollNo:"007", name:"Dipesh Tamang",   class:"8A",  parentName:"Karma Tamang",   parentPhone:"9841000007", gender:"Male",   address:"Boudha, Kathmandu",    dob:"2011-02-14" },
  { id:"s8",  rollNo:"008", name:"Manisha Shrestha",class:"8A",  parentName:"Purna Shrestha", parentPhone:"9841000008", gender:"Female", address:"Chabahil, Kathmandu",  dob:"2011-11-03" },
  { id:"s9",  rollNo:"009", name:"Suraj Basnet",    class:"8B",  parentName:"Gita Basnet",    parentPhone:"9841000009", gender:"Male",   address:"Kirtipur",             dob:"2011-08-20" },
  { id:"s10", rollNo:"010", name:"Nisha Adhikari",  class:"10B", parentName:"Laxmi Adhikari", parentPhone:"9841000010", gender:"Female", address:"Jorpati, Kathmandu",   dob:"2009-12-31" },
  { id:"s11", rollNo:"011", name:"Kiran Bhandari",  class:"7A",  parentName:"Ram Bhandari",   parentPhone:"9841000011", gender:"Male",   address:"Maharajgunj",          dob:"2012-05-16" },
  { id:"s12", rollNo:"012", name:"Pooja Joshi",     class:"7A",  parentName:"Shyam Joshi",    parentPhone:"9841000012", gender:"Female", address:"New Road, Kathmandu",  dob:"2012-03-08" },
];

// ─── Teachers ──────────────────────────────────────────────────────────────────
// Emails use a generic pattern — the actual domain comes from the school's setup
export const mockTeachers = [
  { id:"t1", name:"Sunita Koirala",  subject:"Mathematics",   classes:["10A","10B","9A"], qualification:"M.Ed Mathematics", phone:"9851000001", email:"sunita.koirala@school.edu.np",  joiningDate:"2075-04-01" },
  { id:"t2", name:"Ramesh Dhakal",   subject:"Science",       classes:["9A","9B","8A"],  qualification:"B.Sc Physics",     phone:"9851000002", email:"ramesh.dhakal@school.edu.np",   joiningDate:"2076-06-15" },
  { id:"t3", name:"Meena Shrestha",  subject:"Nepali",        classes:["10A","9B","8B"], qualification:"M.A. Nepali",      phone:"9851000003", email:"meena.shrestha@school.edu.np",  joiningDate:"2074-02-20" },
  { id:"t4", name:"Prakash Adhikari",subject:"English",       classes:["10B","9A","7A"], qualification:"M.A. English",     phone:"9851000004", email:"prakash.adhikari@school.edu.np",joiningDate:"2077-01-10" },
  { id:"t5", name:"Kamala Thapa",    subject:"Social Studies",classes:["8A","8B","7A"],  qualification:"B.Ed Social",      phone:"9851000005", email:"kamala.thapa@school.edu.np",    joiningDate:"2078-03-05" },
];

// ─── Homework ──────────────────────────────────────────────────────────────────
export const mockHomework = [
  { id:"h1", title:"Quadratic Equations Practice Set", subject:"Mathematics",  class:"10A", dueDate:"2082-01-20", priority:"high",   description:"Complete exercises 5.1 to 5.4 from the textbook.",             postedBy:"Sunita Koirala",  postedAt:"2082-01-15" },
  { id:"h2", title:"Essay: My Neighbourhood",          subject:"Nepali",       class:"9B",  dueDate:"2082-01-22", priority:"medium", description:"Write a 500-word essay in Nepali about your neighbourhood.",    postedBy:"Meena Shrestha",  postedAt:"2082-01-16" },
  { id:"h3", title:"Lab Report: Photosynthesis",       subject:"Science",      class:"9A",  dueDate:"2082-01-25", priority:"high",   description:"Complete the lab report from last week's experiment.",          postedBy:"Ramesh Dhakal",   postedAt:"2082-01-17" },
  { id:"h4", title:"Reading Comprehension Chapter 7",  subject:"English",      class:"10B", dueDate:"2082-01-21", priority:"low",    description:"Read chapter 7 and answer the comprehension questions at end.", postedBy:"Prakash Adhikari",postedAt:"2082-01-16" },
  { id:"h5", title:"Map Work: Nepal Districts",        subject:"Social Studies",class:"8A", dueDate:"2082-01-23", priority:"medium", description:"Label all 77 districts on the provided blank map.",             postedBy:"Kamala Thapa",    postedAt:"2082-01-15" },
  { id:"h6", title:"Algebra Problem Set 3",            subject:"Mathematics",  class:"9A",  dueDate:"2082-01-24", priority:"high",   description:"Solve all problems from exercise 3.2.",                        postedBy:"Sunita Koirala",  postedAt:"2082-01-17" },
];

// ─── Notices ───────────────────────────────────────────────────────────────────
export const mockNotices = [
  { id:"n1", title:"Annual Sports Day 2082",       category:"event",   content:"Annual Sports Day will be held on Falgun 15, 2082. All students must participate. Sports uniform is mandatory.",                      important:true,  postedBy:"Admin",           postedAt:"2082-01-10" },
  { id:"n2", title:"First Term Exam Schedule",     category:"exam",    content:"First term examinations will commence from Falgun 20, 2082. Detailed timetable has been distributed in classes.",                      important:true,  postedBy:"Admin",           postedAt:"2082-01-12" },
  { id:"n3", title:"School Holiday – Maha Shivaratri", category:"holiday", content:"School will remain closed on Falgun 18, 2082 on the occasion of Maha Shivaratri. Classes resume Falgun 19.",               important:false, postedBy:"Admin",           postedAt:"2082-01-14" },
  { id:"n4", title:"Parent-Teacher Meeting",       category:"event",   content:"Parent-Teacher meeting is scheduled for Falgun 22, 2082. All parents are requested to attend without fail.",                          important:true,  postedBy:"Sunita Koirala",  postedAt:"2082-01-15" },
  { id:"n5", title:"Fee Submission Reminder",      category:"urgent",  content:"Last date for second installment fee submission is Falgun 25, 2082. Late charges will apply after the due date.",                      important:true,  postedBy:"Admin",           postedAt:"2082-01-16" },
];

// ─── Attendance ────────────────────────────────────────────────────────────────
export const mockAttendance = {
  "s1": {
    "2082-01-01":"present","2082-01-02":"present","2082-01-03":"absent",
    "2082-01-06":"present","2082-01-07":"late",   "2082-01-08":"present",
    "2082-01-09":"present","2082-01-10":"present","2082-01-13":"present",
    "2082-01-14":"present","2082-01-15":"excused","2082-01-16":"present",
    "2082-01-17":"present",
  }
};

// ─── Exam Results ──────────────────────────────────────────────────────────────
export const mockExamResults = [
  {
    id:"r1", studentId:"s1", studentName:"Aarav Sharma", class:"10A",
    exam:"First Term 2082", subjects:[
      { name:"Mathematics",   fullMarks:100, passMarks:40, obtained:88 },
      { name:"Science",       fullMarks:100, passMarks:40, obtained:79 },
      { name:"Nepali",        fullMarks:100, passMarks:40, obtained:72 },
      { name:"English",       fullMarks:100, passMarks:40, obtained:85 },
      { name:"Social Studies",fullMarks:100, passMarks:40, obtained:76 },
    ]
  },
  {
    id:"r2", studentId:"s2", studentName:"Priya Thapa", class:"10A",
    exam:"First Term 2082", subjects:[
      { name:"Mathematics",   fullMarks:100, passMarks:40, obtained:92 },
      { name:"Science",       fullMarks:100, passMarks:40, obtained:88 },
      { name:"Nepali",        fullMarks:100, passMarks:40, obtained:95 },
      { name:"English",       fullMarks:100, passMarks:40, obtained:90 },
      { name:"Social Studies",fullMarks:100, passMarks:40, obtained:87 },
    ]
  },
];

// ─── Fee Records ───────────────────────────────────────────────────────────────
export const mockFees = [
  { id:"f1", studentId:"s1",  studentName:"Aarav Sharma",    class:"10A", amount:12000, paid:12000, status:"paid",    dueDate:"2082-01-15", paidDate:"2082-01-12", method:"cash"          },
  { id:"f2", studentId:"s2",  studentName:"Priya Thapa",     class:"10A", amount:12000, paid:6000,  status:"partial", dueDate:"2082-01-15", paidDate:"2082-01-10", method:"bank_transfer"  },
  { id:"f3", studentId:"s3",  studentName:"Bikash Karki",    class:"10B", amount:12000, paid:0,     status:"overdue", dueDate:"2082-01-15", paidDate:null,         method:null            },
  { id:"f4", studentId:"s4",  studentName:"Srijana Gurung",  class:"9A",  amount:10000, paid:10000, status:"paid",    dueDate:"2082-01-20", paidDate:"2082-01-18", method:"esewa"         },
  { id:"f5", studentId:"s5",  studentName:"Rohan Pandey",    class:"9A",  amount:10000, paid:0,     status:"pending", dueDate:"2082-01-25", paidDate:null,         method:null            },
  { id:"f6", studentId:"s6",  studentName:"Anjali Rai",      class:"9B",  amount:10000, paid:10000, status:"paid",    dueDate:"2082-01-20", paidDate:"2082-01-15", method:"cash"          },
];

// ─── Messages ──────────────────────────────────────────────────────────────────
export const mockMessages = [
  {
    id:"m1", from:"Rajesh Sharma", fromRole:"parent", to:"Sunita Koirala", toRole:"teacher",
    subject:"Regarding Aarav's performance",
    content:"Namaste, I wanted to ask about Aarav's performance in mathematics this month. He seems to be struggling with some topics.",
    timestamp:"2082-01-16 10:30", read:true,
    replies:[
      { id:"m1r1", from:"Sunita Koirala", content:"Namaste Rajesh ji, Aarav is doing well overall. His recent test score was 88/100. Please ensure he practices quadratic equations at home.", timestamp:"2082-01-16 14:15", read:true }
    ]
  },
  {
    id:"m2", from:"Mohan Thapa", fromRole:"parent", to:"Prakash Adhikari", toRole:"teacher",
    subject:"English homework clarification",
    content:"Sir, could you please clarify what the chapter 7 comprehension questions require? Priya is unsure which questions to attempt.",
    timestamp:"2082-01-17 09:00", read:false, replies:[]
  },
  {
    id:"m3", from:"Sunita Koirala", fromRole:"teacher", to:"Rajesh Sharma", toRole:"parent",
    subject:"Math exam preparation",
    content:"Mr. Sharma, please ensure Aarav practices quadratic equations daily. The term exam is approaching in Falgun.",
    timestamp:"2082-01-15 16:00", read:true, replies:[]
  },
];

// ─── Class Routine ─────────────────────────────────────────────────────────────
export const mockRoutine = {
  "10A": {
    Monday:    [
      { period:1, subject:"Mathematics",   teacher:"Sunita Koirala",  room:"Room 201", time:"6:45–7:30"  },
      { period:2, subject:"English",       teacher:"Prakash Adhikari",room:"Room 201", time:"7:30–8:15"  },
      { period:3, subject:"Science",       teacher:"Ramesh Dhakal",   room:"Lab 1",    time:"8:15–9:00"  },
      { period:4, subject:"Break",         teacher:"",                room:"",         time:"9:00–9:15"  },
      { period:5, subject:"Nepali",        teacher:"Meena Shrestha",  room:"Room 201", time:"9:15–10:00" },
      { period:6, subject:"Social Studies",teacher:"Kamala Thapa",    room:"Room 201", time:"10:00–10:45"},
    ],
    Tuesday:   [
      { period:1, subject:"Science",       teacher:"Ramesh Dhakal",   room:"Lab 1",    time:"6:45–7:30"  },
      { period:2, subject:"Mathematics",   teacher:"Sunita Koirala",  room:"Room 201", time:"7:30–8:15"  },
      { period:3, subject:"Nepali",        teacher:"Meena Shrestha",  room:"Room 201", time:"8:15–9:00"  },
      { period:4, subject:"Break",         teacher:"",                room:"",         time:"9:00–9:15"  },
      { period:5, subject:"English",       teacher:"Prakash Adhikari",room:"Room 201", time:"9:15–10:00" },
      { period:6, subject:"Mathematics",   teacher:"Sunita Koirala",  room:"Room 201", time:"10:00–10:45"},
    ],
    Wednesday: [
      { period:1, subject:"Nepali",        teacher:"Meena Shrestha",  room:"Room 201", time:"6:45–7:30"  },
      { period:2, subject:"Social Studies",teacher:"Kamala Thapa",    room:"Room 201", time:"7:30–8:15"  },
      { period:3, subject:"Mathematics",   teacher:"Sunita Koirala",  room:"Room 201", time:"8:15–9:00"  },
      { period:4, subject:"Break",         teacher:"",                room:"",         time:"9:00–9:15"  },
      { period:5, subject:"Science",       teacher:"Ramesh Dhakal",   room:"Lab 1",    time:"9:15–10:00" },
      { period:6, subject:"English",       teacher:"Prakash Adhikari",room:"Room 201", time:"10:00–10:45"},
    ],
    Thursday:  [
      { period:1, subject:"English",       teacher:"Prakash Adhikari",room:"Room 201", time:"6:45–7:30"  },
      { period:2, subject:"Science",       teacher:"Ramesh Dhakal",   room:"Lab 1",    time:"7:30–8:15"  },
      { period:3, subject:"Social Studies",teacher:"Kamala Thapa",    room:"Room 201", time:"8:15–9:00"  },
      { period:4, subject:"Break",         teacher:"",                room:"",         time:"9:00–9:15"  },
      { period:5, subject:"Mathematics",   teacher:"Sunita Koirala",  room:"Room 201", time:"9:15–10:00" },
      { period:6, subject:"Nepali",        teacher:"Meena Shrestha",  room:"Room 201", time:"10:00–10:45"},
    ],
    Friday:    [
      { period:1, subject:"Social Studies",teacher:"Kamala Thapa",    room:"Room 201", time:"6:45–7:30"  },
      { period:2, subject:"Nepali",        teacher:"Meena Shrestha",  room:"Room 201", time:"7:30–8:15"  },
      { period:3, subject:"English",       teacher:"Prakash Adhikari",room:"Room 201", time:"8:15–9:00"  },
      { period:4, subject:"Break",         teacher:"",                room:"",         time:"9:00–9:15"  },
      { period:5, subject:"Science",       teacher:"Ramesh Dhakal",   room:"Lab 1",    time:"9:15–10:00" },
      { period:6, subject:"Mathematics",   teacher:"Sunita Koirala",  room:"Room 201", time:"10:00–10:45"},
    ],
  }
};

// ─── Calendar Events (academic + public holidays) ─────────────────────────────
// Note: the full Nepal public holidays dataset is managed in CalendarPage.jsx
// These are the school-specific academic events only
export const mockCalendarEvents = [
  { id:"c1",  bsDate:"2082-01-15", title:"School Opens – New Session 2082-83",  type:"event",   description:"Academic year 2082-83 begins. All students report at 6:30 AM." },
  { id:"c2",  bsDate:"2082-01-25", title:"Parent-Teacher Meeting",               type:"meeting", description:"Quarterly PTM for all classes. Parents are requested to attend." },
  { id:"c3",  bsDate:"2082-02-29", title:"Saraswati Puja",                       type:"holiday", description:"School closed for Saraswati Puja – Goddess of Learning." },
  { id:"c4",  bsDate:"2082-03-15", title:"First Term Exams Begin",               type:"exam",    description:"First term examinations for all classes (Grades 7–10)." },
  { id:"c5",  bsDate:"2082-03-25", title:"First Term Results Published",         type:"event",   description:"First term results available. Collect marksheets from class teacher." },
  { id:"c6",  bsDate:"2082-04-01", title:"Annual Sports Day",                    type:"event",   description:"Annual sports day – sports uniform mandatory. All students participate." },
  { id:"c7",  bsDate:"2082-05-15", title:"Mid-Year Parent-Teacher Meeting",      type:"meeting", description:"Mid-year PTM. Progress reports distributed." },
  { id:"c8",  bsDate:"2082-05-29", title:"Republic Day",                         type:"holiday", description:"National Republic Day. School closed." },
  { id:"c9",  bsDate:"2082-06-15", title:"Dashain Holiday Begins",               type:"holiday", description:"School closed from Ghatasthapana. Reopens after Tihar." },
  { id:"c10", bsDate:"2082-07-06", title:"School Reopens After Dashain-Tihar",  type:"event",   description:"School resumes after Dashain and Tihar holidays." },
  { id:"c11", bsDate:"2082-09-01", title:"Prithvi Jayanti",                     type:"holiday", description:"National Unity Day. School closed." },
  { id:"c12", bsDate:"2082-10-05", title:"Saraswati Puja 2082",                 type:"holiday", description:"School closed for Saraswati Puja." },
  { id:"c13", bsDate:"2082-10-17", title:"Maha Shivaratri",                     type:"holiday", description:"School closed. National public holiday." },
  { id:"c14", bsDate:"2082-10-20", title:"Second Term Exams Begin",             type:"exam",    description:"Second term examinations for all classes." },
  { id:"c15", bsDate:"2082-11-05", title:"Fagu Purnima / Holi",                 type:"holiday", description:"Holi festival. School closed." },
  { id:"c16", bsDate:"2082-11-15", title:"Annual Sports Day",                   type:"event",   description:"Annual athletics meet – ground venue." },
  { id:"c17", bsDate:"2082-11-22", title:"Final Parent-Teacher Meeting",        type:"meeting", description:"Year-end PTM. Annual report cards distributed." },
  { id:"c18", bsDate:"2082-12-15", title:"Final Exams Begin",                   type:"exam",    description:"Annual final examinations for all classes." },
  { id:"c19", bsDate:"2082-12-28", title:"Annual Result Day",                   type:"event",   description:"Annual exam results published. Promotion list displayed." },
];

// ─── Chart data ────────────────────────────────────────────────────────────────
export const attendanceChartData = [
  { month:"Bhadra",  present:92, absent:8  },
  { month:"Ashwin",  present:88, absent:12 },
  { month:"Kartik",  present:94, absent:6  },
  { month:"Mangsir", present:91, absent:9  },
  { month:"Poush",   present:87, absent:13 },
  { month:"Magh",    present:93, absent:7  },
];

export const enrollmentData = [
  { year:"2078", students:320 },
  { year:"2079", students:368 },
  { year:"2080", students:410 },
  { year:"2081", students:445 },
  { year:"2082", students:487 },
];

// ─── Constants ────────────────────────────────────────────────────────────────
export const CLASSES  = ["7A","7B","8A","8B","9A","9B","10A","10B"];
export const SUBJECTS = ["Mathematics","Science","Nepali","English","Social Studies","Computer Science","Health & Physical Education","Optional Mathematics"];
