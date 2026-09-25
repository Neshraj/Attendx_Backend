# AttendX — Smart Attendance Management SaaS

> **Pre-Drive Product Engineering Assessment — Assignment 1**

AttendX is a **multi-tenant SaaS attendance management platform** designed for schools and colleges.

Instead of building an attendance system for only one institution, AttendX allows multiple schools and colleges to create their own institution workspace and independently manage students, faculty, departments, sections, subjects, attendance records, correction requests, and related workflows.

---

## 🚀 Live Application

### Frontend

**https://attendx-z47z.onrender.com**

### Backend API

**https://attendx-server-vmyb.onrender.com**

### GitHub Repository

**https://github.com/Neshraj/Attendx**

### Backend Repository

**https://github.com/Neshraj/Attendx_Backend**

### Frontend Repository

**https://github.com/Neshraj/Attendx_Frontend**

---

# 📌 Assignment

### Assignment 1 — Smart Attendance Management

The original business problem describes a college with approximately:

* 5,000 students
* 200 faculty members
* Multiple departments
* Multiple classes and sections
* Multiple subjects

The system needs to support:

* Attendance recording
* Attendance corrections
* Attendance review
* Attendance history
* Identification of students with low attendance
* Appropriate users, workflows and permissions
* Reporting and useful administrative visibility

---

# 💡 Product Approach

I expanded the problem into a **multi-tenant SaaS product** rather than creating an application for a single college.

The basic product model is:

```text
Platform
   │
   ├── Institution A
   │      ├── Admin
   │      ├── Faculty
   │      ├── Students
   │      ├── Departments
   │      ├── Sections
   │      └── Subjects
   │
   ├── Institution B
   │      ├── Admin
   │      ├── Faculty
   │      ├── Students
   │      ├── Departments
   │      ├── Sections
   │      └── Subjects
   │
   └── Institution C
          ├── Admin
          ├── Faculty
          ├── Students
          ├── Departments
          ├── Sections
          └── Subjects
```

Each institution operates inside its own workspace.

Users are associated with an institution, and backend authorization prevents users from accessing another institution's data.

---

# 🎯 Why SaaS?

A single-college implementation solves only one instance of the problem.

A SaaS approach makes the product reusable for:

* Schools
* Engineering colleges
* Degree colleges
* Universities
* Training institutes
* Other educational organizations

The same application can therefore support multiple institutions without deploying a separate application for every college.

---

# 👥 User Roles

AttendX has four major roles.

## 1. Platform Admin

Responsible for the overall SaaS platform.

Responsibilities include:

* Institution management
* Platform-level administration
* Monitoring institution workspaces

---

## 2. Institution Admin

Responsible for managing an individual school or college.

Responsibilities include:

* Academic structure
* Departments
* Sections
* Subjects
* Faculty
* Students
* Attendance oversight
* Correction requests
* Administrative visibility

---

## 3. Faculty

Faculty members can:

* View assigned sections
* View assigned subjects
* Start attendance sessions
* Mark students Present/Absent
* Finalize attendance
* View attendance history

Faculty cannot arbitrarily modify attendance belonging to another faculty member or institution.

---

## 4. Student

Students can:

* View their attendance
* View subject-wise attendance percentage
* View attendance history
* Identify low-attendance subjects
* Request attendance corrections

Students cannot directly modify their attendance records.

---

# 🔄 Core Attendance Workflow

The main workflow is:

```text
Faculty Login
      ↓
Select Section
      ↓
Select Subject
      ↓
Create Attendance Session
      ↓
Load Students
      ↓
Mark Present / Absent
      ↓
Finalize Attendance
      ↓
Attendance History
      ↓
Student Views Attendance
      ↓
Student Requests Correction
      ↓
Institution Admin Reviews
      ↓
Approve / Reject
      ↓
Attendance Updated + Audit Information
```

---

# 🛡️ Attendance Correction Workflow

A student should not be able to directly edit an attendance record.

Instead:

```text
Student
   │
   │ Correction Request
   ↓
Institution Admin
   │
   ├── Approve
   │      ↓
   │   Attendance Updated
   │
   └── Reject
          ↓
       Record Remains
```

This provides better control and reduces accidental or unauthorized modifications.

---

# 🏢 Multi-Tenant Architecture

Tenant isolation is one of the important engineering decisions in AttendX.

The backend identifies the institution associated with the authenticated user.

Tenant-owned database queries are scoped to that institution.

Conceptually:

```text
Authenticated User
        ↓
Authentication
        ↓
User Identity + Role + Institution
        ↓
Authorization
        ↓
Tenant-Scoped Database Query
        ↓
MongoDB
```

The frontend is not trusted to decide which institution a user belongs to.

Authorization is enforced on the backend.

---

# 🧱 Technology Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Axios
* Responsive UI

## Backend

* Node.js
* Express.js
* REST APIs
* Authentication
* Role-based authorization
* Tenant isolation

## Database

* MongoDB Atlas
* Mongoose

## Deployment

* Render — Frontend
* Render — Backend
* MongoDB Atlas — Database

## Development Tools

* VS Code
* Git
* GitHub
* Postman
* Browser Developer Tools
* AI-assisted development tools

---

# 🏗️ High-Level Architecture

```text
                    ┌──────────────────────┐
                    │      User Browser    │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │   React + Tailwind   │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                         REST / Axios
                               │
                               ↓
                    ┌──────────────────────┐
                    │   Express / Node.js  │
                    │      Backend API     │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ↓              ↓              ↓
          Authentication   Authorization   Validation
                │              │              │
                └──────────────┼──────────────┘
                               ↓
                    ┌──────────────────────┐
                    │       Mongoose       │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │     MongoDB Atlas    │
                    └──────────────────────┘
```

---

# 📚 Main Functional Areas

## Authentication

The application provides authentication for different user roles.

Authentication is handled on the backend and protected API routes require an authenticated user.

---

## Academic Management

Institution administrators can manage the academic structure used by the attendance system.

The structure includes concepts such as:

```text
Institution
    ↓
Department
    ↓
Section
    ↓
Students
```

Subjects and faculty assignments are associated with the academic structure.

---

## Attendance Management

Faculty can:

1. Select a section
2. Select a subject
3. Select the attendance date/time
4. View the students
5. Mark attendance
6. Finalize the session

---

## Attendance History

Attendance records provide historical visibility into previous attendance sessions.

This allows users to understand:

* When attendance was taken
* Which subject was involved
* Student attendance status
* Attendance trends

---

## Student Attendance Dashboard

Students can see subject-wise attendance.

For example:

```text
Database Management       85%
Python Programming        92%
Web Technology            71%
```

Low attendance is visually highlighted.

---

## Low Attendance Identification

Subject attendance percentage is calculated using:

```text
Attendance Percentage =
(Present Sessions / Total Sessions) × 100
```

Subjects below the configured attendance threshold are highlighted so that students and administrators can identify potential attendance issues.

---

# 🔐 Security and Authorization

Important security considerations include:

### Authentication

Protected resources require an authenticated user.

### Role-Based Access Control

Different roles receive different permissions.

For example:

```text
Student  → View own attendance
Faculty  → Mark attendance
Admin    → Manage institution
Platform Admin → Manage platform
```

### Tenant Isolation

Users are restricted to their institution's data.

### Backend Authorization

Authorization is enforced by the backend rather than relying only on frontend route visibility.

---

# ⚠️ Important Edge Cases

The application considers several failure and business scenarios.

## Duplicate Attendance

The system prevents creating duplicate attendance sessions for the same relevant academic combination.

The business rule considers:

```text
Subject
+
Section
+
Date
+
Time
```

---

## Empty Section

If a selected section has no students, the faculty receives a clear message instead of an empty attendance interface.

---

## Unauthorized Faculty

Faculty should only work with their authorized academic assignments.

---

## Cross-Institution Access

A user from Institution A should not be able to access Institution B's data.

---

## Student Modification

Students cannot directly modify attendance records.

They must submit a correction request.

---

## Finalized Attendance

After attendance is finalized, changes should go through the correction workflow instead of allowing arbitrary edits.

---

## Authentication Failure

Expired or invalid authentication results in protected API access being rejected.

---

## Network/API Failure

Frontend API failures are handled and surfaced to the user instead of silently failing.

---

# 📊 Data Model — Conceptual

The major relationships are:

```text
Organization
    │
    ├── Users
    │
    ├── Departments
    │       └── Sections
    │              └── Students
    │
    ├── Subjects
    │
    ├── Faculty Assignments
    │
    ├── Attendance Sessions
    │       └── Attendance Records
    │
    └── Correction Requests
```

The actual implementation uses MongoDB collections/models appropriate to the application.

---

# 🧪 Validation and Testing

The application was validated through role-based workflows.

### Platform Admin

* Authentication
* Institution management

### Institution Admin

* Academic management
* User management
* Attendance oversight
* Correction workflow

### Faculty

* Login
* Section/subject selection
* Student loading
* Attendance marking
* Attendance finalization
* Attendance history

### Student

* Login
* Attendance dashboard
* Subject percentages
* Attendance history
* Correction request

### Deployment Validation

The deployed system was tested using:

* Render frontend
* Render backend
* MongoDB Atlas
* Browser Developer Tools
* API/network inspection
* Authentication testing

---

# 🔧 Engineering Decisions

## Why React?

React provides a component-based architecture suitable for dashboards with multiple role-specific interfaces.

## Why Node.js + Express?

Node.js and Express provide a lightweight REST API architecture that is easy to maintain and extend.

## Why MongoDB?

MongoDB provides flexible document modeling and works well with the hierarchical and evolving structure of an educational management system.

## Why REST?

REST provides simple and predictable resource-based APIs and keeps the frontend/backend separation clear.

## Why Tailwind CSS?

Tailwind allows responsive interfaces to be created quickly while keeping styling close to the component structure.

---

# ⚖️ Trade-offs

## MongoDB vs Relational Database

MongoDB provides flexibility and fast development.

A relational database could provide stronger relational constraints and may be preferred for certain large-scale transactional requirements.

For this prototype, MongoDB provides a practical balance between flexibility and development speed.

## SaaS vs Single Institution

SaaS introduces additional tenant and authorization complexity.

However, it makes the product much more reusable and commercially scalable.

## Correction Workflow vs Direct Editing

Direct editing would be simpler.

However, a correction workflow provides stronger attendance integrity and accountability.

---

# 📈 Future Improvements

The current solution focuses on the core assignment. A production version could be extended with:

* QR-code attendance
* Bulk student import
* Excel/CSV import
* PDF attendance reports
* Advanced analytics
* Parent portal
* Email notifications
* SMS/WhatsApp notifications
* Automated low-attendance alerts
* Academic year management
* Semester management
* Configurable attendance thresholds
* Attendance locking
* Detailed audit logs
* Institution subscription management
* Usage analytics
* Automated backups
* Monitoring and observability
* Automated unit/integration/E2E testing

---

# ☁️ Deployment

## Frontend

Hosted on Render:

**https://attendx-z47z.onrender.com**

The frontend communicates with the backend through:

```text
https://attendx-server-vmyb.onrender.com/api
```

## Backend

Hosted on Render:

**https://attendx-server-vmyb.onrender.com**

## Database

MongoDB Atlas is used as the cloud database.

Sensitive configuration such as:

```text
MONGODB_URI
JWT_SECRET
```

is stored as environment variables and is not committed to the repository.

---

# 🔑 Environment Configuration

## Backend

The backend requires environment variables such as:

```text
MONGODB_URI
JWT_SECRET
CLIENT_URL
```

`PORT` is provided by the hosting platform.

## Frontend

The frontend uses:

```text
VITE_API_URL
```

The deployed frontend points to:

```text
https://attendx-server-vmyb.onrender.com/api
```

---

# 🤖 AI-Assisted Development

AI-assisted development was used during the project.

### Tool Used

**ChatGPT**

### AI Assistance Included

* Product requirement analysis
* SaaS architecture planning
* Database modeling ideas
* API design assistance
* React component development
* Tailwind UI development
* Validation and edge-case identification
* Debugging
* Deployment troubleshooting
* Documentation

AI-generated code was not blindly accepted.

Generated code was validated using:

* Browser testing
* API testing
* Runtime errors
* React Developer Tools
* Backend logs
* Render deployment logs
* MongoDB Atlas
* Role-based workflows

Several AI-generated issues were identified and corrected during development, including React Hooks ordering, API response handling, missing imports, deployment dependencies, environment variables and production CORS configuration.

---

# 📝 AI Validation Example

One example was a React Hooks error caused by a `useMemo` appearing after a conditional return.

The browser reported:

```text
Rendered more hooks than during the previous render.
```

The issue was identified from the React runtime error and corrected by ensuring hooks execute consistently on every render.

Another issue occurred when attendance data was assumed to be directly iterable:

```text
records is not iterable
```

The API response structure was inspected and the frontend handling was corrected.

This demonstrates that AI output was treated as development assistance rather than automatically trusted code.

---

# 📁 Repository

## Frontend / Main Repository

**https://github.com/Neshraj/Attendx**

## Backend Repository

**https://github.com/Neshraj/Attendx_Backend**

---

# 🌐 Live Links

| Component        | URL                                        |
| ---------------- | ------------------------------------------ |
| AttendX Frontend | https://attendx-z47z.onrender.com          |
| AttendX Backend  | https://attendx-server-vmyb.onrender.com   |
| Frontend GitHub  | https://github.com/Neshraj/Attendx         |
| Backend GitHub   | https://github.com/Neshraj/Attendx_Backend |

---

# 🎓 Assessment Summary

AttendX approaches the Smart Attendance Management problem as a real product rather than only a CRUD application.

The main product principles are:

```text
Multi-Tenancy
      +
Role-Based Access
      +
Attendance Integrity
      +
Correction Workflow
      +
Tenant Isolation
      +
Responsive UX
      +
Cloud Deployment
```

The goal was to create a practical foundation that can start with a college and scale into a reusable attendance SaaS platform for multiple educational institutions.

---

# 👨‍💻 Candidate

**S Neshraj**

**B.Tech — Computer Science and Engineering**

GitHub:

**https://github.com/Neshraj**

Portfolio:

**https://sneshrajportfolio.onrender.com**

LinkedIn:

**https://linkedin.com/in/sneshraj**
