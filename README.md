# Student Attendance Management App (MCA College Project)

A lightweight, fully functional mobile attendance management system built with **React Native**, **Expo (SDK 58)**, and **AsyncStorage** for persistent local storage. Designed for college viva examinations and daily classroom management.

---

## 📱 Features

1. **Student Management**
   - Register students with Full Name, Roll Number, and Semester.
   - Real-time search by student name or roll number.
   - Semester filtering (Semester 1 to Semester 4).
   - Duplicate roll number validation (prevents duplicate entries).
   - Edit existing student details.
   - Delete student records with confirmation dialog.

2. **Subject Management**
   - Add curriculum subjects with Course Code (e.g., `MCA-101`) and Subject Title.
   - Displays real-time count of classes conducted for each subject.
   - Delete subjects with confirmation dialog and automatic cascade cleanup.

3. **Attendance Marking**
   - Select Subject and Date (Today, Yesterday, or Custom `YYYY-MM-DD`).
   - Live registered student roster with toggle buttons for **Present [P]** and **Absent [A]**.
   - **Quick Actions:** "Mark All Present" and "Mark All Absent".
   - **Duplicate Session Prevention:** Automatically detects if attendance has already been recorded for that subject and date, switching into edit mode so existing sessions can be updated without duplication.
   - Live counters showing Total, Present, and Absent counts.

4. **Accurate Attendance Percentage & Shortage Alerts**
   - Formula:
     $$\text{Attendance Percentage} = \left(\frac{\text{Classes Attended}}{\text{Total Classes}}\right) \times 100$$
   - Displays `0.0%` when no attendance has been recorded (`Total Classes = 0`).
   - Highlight students with **below 75% attendance** (Red badge and Shortage tag).
   - Real-time recalculation whenever attendance records are added, edited, or deleted.

5. **Executive Dashboard**
   - Total registered students.
   - Total active subjects.
   - Total attendance sessions conducted.
   - Today's Present & Absent counts.
   - Total count of students below 75% attendance threshold.
   - "Attendance Shortage Alert (< 75%)" section displaying defaulters.
   - "Recent Attendance Sessions" quick list with tap-to-edit.
   - **Sample Data Generator:** Single tap loads 8 realistic MCA students, 4 subjects, and past attendance sessions for instant viva demonstration.

6. **Comprehensive Attendance Reports**
   - **Subject-wise Report:** Switch between subjects, filter by "Only < 75%", and inspect individual attendance stats (Attended, Missed, Total, %).
   - **Student-wise Report:** Select any student to see overall attendance, per-subject breakdown, and detailed session history log.
   - **Past Sessions Log:** Browse all recorded sessions by date/subject, with direct options to Edit or Delete.

---

## 🛠️ Technology Stack

- **Framework:** React Native with Expo (SDK 58)
- **Language:** JavaScript (ES6+)
- **Navigation:** React Navigation (`@react-navigation/native`, `@react-navigation/bottom-tabs`)
- **Storage:** `@react-native-async-storage/async-storage` (100% offline, local persistent storage)
- **Icons:** `@expo/vector-icons` (Ionicons)
- **Styling:** React Native `StyleSheet` with clean blue-and-white academic theme

---

## 🚀 How to Run the App

### Prerequisites
- Node.js (v18 or newer recommended, verified on v24)
- Android phone with **Expo Go** app installed from Google Play Store, OR Android Emulator / Web browser.

### 1. Start the Dev Server
From the project folder:

```bash
npx expo start
```

### 2. Testing on Android Phone (Recommended)
1. Open the **Expo Go** app on your Android device.
2. Ensure your phone and computer are connected to the same Wi-Fi network.
3. Scan the QR code displayed in the terminal.
4. If on separate networks or hotspots, run with tunnel mode:
   ```bash
   npx expo start --tunnel
   ```

### 3. Testing on Android Emulator
Press `a` in the terminal after starting `npx expo start`.

### 4. Testing on Web Browser
Press `w` in the terminal or run:
```bash
npx expo start --web
```

---

## 📋 College Viva / Demonstration Flow

When demonstrating this project to professors:

1. **Launch App:**
   - On the first open, realistic MCA sample data is preloaded automatically.
   - You can also tap **"Sample Data"** in the top header or **"Clear All App Data"** at the bottom to start fresh.

2. **Dashboard Demonstration:**
   - Point out the 5 KPI cards: Total Students, Total Subjects, Today's Present, Today's Absent, Total Sessions, and Students Below 75%.
   - Show the **Attendance Shortage Alert (< 75%)** section highlighting students who need attention.

3. **Students Screen:**
   - Tap the **Students** tab.
   - Use the **Search Bar** to filter by name or roll number.
   - Tap **"Add Student"** to add a new student with duplicate roll number validation.
   - Tap **"Edit"** on a student to demonstrate updating records.

4. **Subjects Screen:**
   - Tap the **Subjects** tab to show registered MCA subjects and classes conducted.
   - Tap **"Add Subject"** to add a new course code and title.

5. **Mark Attendance:**
   - Tap **"Mark"** tab.
   - Select a subject and date.
   - Toggle individual students between **[P]** and **[A]**.
   - Tap **"All Present"** or **"All Absent"** for bulk marking.
   - Save the session; demonstrate that selecting the same subject and date shows the **"Editing Saved Session"** banner, preventing duplicate records.

6. **Attendance Reports:**
   - Tap the **Reports** tab.
   - Show **Subject-wise Report** and check the **"Only < 75%"** filter to show defaulters.
   - Switch to **Student-wise Report** to show an individual student's subject breakdown and history log.
   - Switch to **Past Sessions** to show historical records with Edit and Delete options.
