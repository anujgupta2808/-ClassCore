  ClassCore — Student Management System

A polished student record portal with a login/signup flow, live search, table actions, and CSV export.

> Start the app by opening `login.html` in a browser.

---

  ✨ Features

- **Login / Signup** with local browser authentication
- **Add, edit, delete** student records
- **Search & sort** by name, roll number, department, or enrollment date
- **Export to CSV** from the student table
- **Responsive dashboard** for mobile and desktop
- **Light/dark theme toggle** with saved preference
- **Sidebar analytics** for total students, departments, latest enrolled
- **Confirmation modal** for safe deletion
- **Toast notifications** for user feedback
- **Collapsible student form** to maximize table space

---

  🛠️ Tech Stack

| Layer   | Technology                         |
|--------|------------------------------------|
| UI      | HTML5, CSS3                        |
| Logic   | Vanilla JavaScript (ES6+)          |
| Auth    | Browser `localStorage` / `sessionStorage` |
| Storage | Local browser storage |

No frameworks. No build tools required for the frontend.

---

  📁 Project Structure

```
├── auth.js          ← Login/signup logic using browser storage
├── banner.svg       ← Auth page illustration
├── favicon.svg      ← Browser favicon
├── index.html       ← Main student dashboard
├── login.html       ← Authentication landing page
├── script.js        ← Student CRUD, search, sort, export logic
├── styles.css       ← App styling, responsive layout, themes
├── README.md        ← Project overview
└── run.bat          ← Legacy backend startup helper
```

---

  🚀 How to Run

1. Open `login.html` in your browser.
2. Create an account or sign in.
3. Use the dashboard to manage student records.

> Note: `auth.js` stores user accounts locally in the browser.

---

  📌 Notes

- Authentication is handled locally in `auth.js`; it is intended for demo and classroom use only.
- To reset login/auth data, clear `uod-users` and `uod-session` from browser storage.
- The `run.bat` file is not required for the frontend demo.

---
