import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  STUDENTS: '@mca_attendance_students_v1',
  SUBJECTS: '@mca_attendance_subjects_v1',
  SESSIONS: '@mca_attendance_sessions_v1',
  INITIALIZED: '@mca_attendance_initialized_v1',
};

// ==========================================
// STUDENT MANAGEMENT
// ==========================================

export const getStudents = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!json) return [];
    const students = JSON.parse(json);
    // Sort alphabetically by roll number
    return students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
  } catch (error) {
    console.error('Error fetching students:', error);
    throw new Error('Failed to load students list.');
  }
};

export const saveStudent = async (studentData) => {
  try {
    const { id, name, rollNumber, semester } = studentData;

    // Validation
    const cleanName = (name || '').trim();
    const cleanRoll = (rollNumber || '').trim();
    const cleanSem = (semester || '').trim();

    if (!cleanName) throw new Error('Student name is required.');
    if (!cleanRoll) throw new Error('Roll number is required.');
    if (!cleanSem) throw new Error('Semester is required.');

    const students = await getStudents();

    // Check duplicate roll number (case-insensitive)
    const duplicate = students.find(
      (s) => s.rollNumber.toUpperCase() === cleanRoll.toUpperCase() && s.id !== id
    );

    if (duplicate) {
      throw new Error(`Roll number "${cleanRoll}" is already assigned to ${duplicate.name}.`);
    }

    let updatedStudents;
    let savedRecord;

    if (id) {
      // Edit existing student
      updatedStudents = students.map((s) => {
        if (s.id === id) {
          savedRecord = {
            ...s,
            name: cleanName,
            rollNumber: cleanRoll,
            semester: cleanSem,
            updatedAt: new Date().toISOString(),
          };
          return savedRecord;
        }
        return s;
      });
    } else {
      // Add new student
      savedRecord = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        name: cleanName,
        rollNumber: cleanRoll,
        semester: cleanSem,
        createdAt: new Date().toISOString(),
      };
      updatedStudents = [...students, savedRecord];
    }

    await AsyncStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    return savedRecord;
  } catch (error) {
    console.error('Error saving student:', error);
    throw error;
  }
};

export const deleteStudent = async (studentId) => {
  try {
    const students = await getStudents();
    const updatedStudents = students.filter((s) => s.id !== studentId);
    await AsyncStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedStudents));
    return true;
  } catch (error) {
    console.error('Error deleting student:', error);
    throw new Error('Failed to delete student.');
  }
};

// ==========================================
// SUBJECT MANAGEMENT
// ==========================================

export const getSubjects = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!json) return [];
    const subjects = JSON.parse(json);
    return subjects.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching subjects:', error);
    throw new Error('Failed to load subjects.');
  }
};

export const saveSubject = async (subjectData) => {
  try {
    const { id, name, code } = subjectData;

    const cleanName = (name || '').trim();
    const cleanCode = (code || '').trim().toUpperCase();

    if (!cleanName) throw new Error('Subject name is required.');
    if (!cleanCode) throw new Error('Subject code is required.');

    const subjects = await getSubjects();

    // Check duplicate code or name
    const duplicate = subjects.find(
      (sub) =>
        (sub.code.toUpperCase() === cleanCode || sub.name.toUpperCase() === cleanName.toUpperCase()) &&
        sub.id !== id
    );

    if (duplicate) {
      if (duplicate.code.toUpperCase() === cleanCode) {
        throw new Error(`Subject code "${cleanCode}" already exists (${duplicate.name}).`);
      }
      throw new Error(`Subject "${cleanName}" already exists.`);
    }

    let updatedSubjects;
    let savedRecord;

    if (id) {
      updatedSubjects = subjects.map((sub) => {
        if (sub.id === id) {
          savedRecord = {
            ...sub,
            name: cleanName,
            code: cleanCode,
            updatedAt: new Date().toISOString(),
          };
          return savedRecord;
        }
        return sub;
      });
    } else {
      savedRecord = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        name: cleanName,
        code: cleanCode,
        createdAt: new Date().toISOString(),
      };
      updatedSubjects = [...subjects, savedRecord];
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(updatedSubjects));
    return savedRecord;
  } catch (error) {
    console.error('Error saving subject:', error);
    throw error;
  }
};

export const deleteSubject = async (subjectId) => {
  try {
    const subjects = await getSubjects();
    const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
    await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(updatedSubjects));

    // Also remove attendance sessions associated with this deleted subject
    const sessions = await getSessions();
    const filteredSessions = sessions.filter((s) => s.subjectId !== subjectId);
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filteredSessions));

    return true;
  } catch (error) {
    console.error('Error deleting subject:', error);
    throw new Error('Failed to delete subject.');
  }
};

// ==========================================
// ATTENDANCE SESSIONS
// ==========================================

export const getSessions = async () => {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!json) return [];
    const sessions = JSON.parse(json);
    // Sort descending by date, then by createdAt
    return sessions.sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date);
      if (dateComparison !== 0) return dateComparison;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw new Error('Failed to load attendance sessions.');
  }
};

export const getSessionBySubjectAndDate = async (subjectId, date) => {
  try {
    const sessions = await getSessions();
    return sessions.find((s) => s.subjectId === subjectId && s.date === date) || null;
  } catch (error) {
    console.error('Error checking existing session:', error);
    return null;
  }
};

export const saveSession = async (sessionData) => {
  try {
    const { id, subjectId, subjectName, date, records, notes } = sessionData;

    if (!subjectId) throw new Error('Please select a subject.');
    if (!date) throw new Error('Please specify an attendance date.');
    if (!records || Object.keys(records).length === 0) {
      throw new Error('No students found to mark attendance.');
    }

    const sessions = await getSessions();

    // Prevent duplicate sessions for the same subject and date (unless updating the same id)
    const existing = sessions.find(
      (s) => s.subjectId === subjectId && s.date === date && s.id !== id
    );

    if (existing) {
      throw new Error(
        `Attendance has already been recorded for ${subjectName || 'this subject'} on ${date}. Please select that session to edit it.`
      );
    }

    // Accurate calculation of counts
    let presentCount = 0;
    let absentCount = 0;
    Object.values(records).forEach((status) => {
      if (status === 'P') presentCount += 1;
      else if (status === 'A') absentCount += 1;
    });

    const totalStudents = Object.keys(records).length;

    let updatedSessions;
    let savedRecord;

    if (id) {
      // Editing existing session
      updatedSessions = sessions.map((s) => {
        if (s.id === id) {
          savedRecord = {
            ...s,
            subjectId,
            subjectName: subjectName || s.subjectName,
            date,
            records,
            totalStudents,
            presentCount,
            absentCount,
            notes: notes || '',
            updatedAt: new Date().toISOString(),
          };
          return savedRecord;
        }
        return s;
      });
    } else {
      // New session
      savedRecord = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        subjectId,
        subjectName,
        date,
        records,
        totalStudents,
        presentCount,
        absentCount,
        notes: notes || '',
        createdAt: new Date().toISOString(),
      };
      updatedSessions = [savedRecord, ...sessions];
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
    return savedRecord;
  } catch (error) {
    console.error('Error saving attendance session:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId) => {
  try {
    const sessions = await getSessions();
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error('Failed to delete attendance session.');
  }
};

// ==========================================
// SEED & DEMO DATA (FOR COLLEGE PROJECT PRESENTATION)
// ==========================================

export const seedSampleData = async () => {
  try {
    const sampleStudents = [
      { id: 'std_01', name: 'Aarav Sharma', rollNumber: 'MCA2401', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_02', name: 'Diya Patel', rollNumber: 'MCA2402', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_03', name: 'Rohan Verma', rollNumber: 'MCA2403', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_04', name: 'Ananya Rao', rollNumber: 'MCA2404', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_05', name: 'Karthik Iyer', rollNumber: 'MCA2405', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_06', name: 'Sneha Kulkarni', rollNumber: 'MCA2406', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_07', name: 'Vikram Joshi', rollNumber: 'MCA2407', semester: 'Semester 1', createdAt: new Date().toISOString() },
      { id: 'std_08', name: 'Pooja Nair', rollNumber: 'MCA2408', semester: 'Semester 1', createdAt: new Date().toISOString() },
    ];

    const sampleSubjects = [
      { id: 'sub_01', name: 'Advanced Data Structures & Algorithms', code: 'MCA-101', createdAt: new Date().toISOString() },
      { id: 'sub_02', name: 'Database Management Systems', code: 'MCA-102', createdAt: new Date().toISOString() },
      { id: 'sub_03', name: 'Full Stack Web Technologies', code: 'MCA-103', createdAt: new Date().toISOString() },
      { id: 'sub_04', name: 'Cloud Computing & DevOps', code: 'MCA-104', createdAt: new Date().toISOString() },
    ];

    // Helper to format dates
    const today = new Date();
    const getDateOffset = (daysAgo) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    // Realistic sessions across multiple dates so stats show rich data:
    // Some students high attendance, Karthik Iyer (std_05) and Vikram Joshi (std_07) will have <75% in some subjects
    const sampleSessions = [
      // Today session
      {
        id: 'sess_01',
        subjectId: 'sub_01',
        subjectName: 'Advanced Data Structures & Algorithms',
        date: getDateOffset(0),
        records: {
          std_01: 'P', std_02: 'P', std_03: 'P', std_04: 'P',
          std_05: 'A', std_06: 'P', std_07: 'A', std_08: 'P',
        },
        totalStudents: 8,
        presentCount: 6,
        absentCount: 2,
        notes: 'Module 3: Graph Traversal Algorithms',
        createdAt: new Date().toISOString(),
      },
      // Yesterday session
      {
        id: 'sess_02',
        subjectId: 'sub_02',
        subjectName: 'Database Management Systems',
        date: getDateOffset(1),
        records: {
          std_01: 'P', std_02: 'P', std_03: 'P', std_04: 'P',
          std_05: 'A', std_06: 'P', std_07: 'P', std_08: 'P',
        },
        totalStudents: 8,
        presentCount: 7,
        absentCount: 1,
        notes: 'Transaction Management & ACID properties',
        createdAt: new Date().toISOString(),
      },
      // 2 days ago
      {
        id: 'sess_03',
        subjectId: 'sub_03',
        subjectName: 'Full Stack Web Technologies',
        date: getDateOffset(2),
        records: {
          std_01: 'P', std_02: 'P', std_03: 'A', std_04: 'P',
          std_05: 'A', std_06: 'P', std_07: 'A', std_08: 'P',
        },
        totalStudents: 8,
        presentCount: 5,
        absentCount: 3,
        notes: 'React Hooks and State Management',
        createdAt: new Date().toISOString(),
      },
      // 3 days ago
      {
        id: 'sess_04',
        subjectId: 'sub_01',
        subjectName: 'Advanced Data Structures & Algorithms',
        date: getDateOffset(3),
        records: {
          std_01: 'P', std_02: 'P', std_03: 'P', std_04: 'P',
          std_05: 'A', std_06: 'P', std_07: 'A', std_08: 'P',
        },
        totalStudents: 8,
        presentCount: 6,
        absentCount: 2,
        notes: 'Binary Trees and AVL Trees',
        createdAt: new Date().toISOString(),
      },
      // 4 days ago
      {
        id: 'sess_05',
        subjectId: 'sub_04',
        subjectName: 'Cloud Computing & DevOps',
        date: getDateOffset(4),
        records: {
          std_01: 'P', std_02: 'P', std_03: 'P', std_04: 'P',
          std_05: 'P', std_06: 'P', std_07: 'P', std_08: 'P',
        },
        totalStudents: 8,
        presentCount: 8,
        absentCount: 0,
        notes: 'Docker Containers and Virtualization',
        createdAt: new Date().toISOString(),
      },
      // 5 days ago
      {
        id: 'sess_06',
        subjectId: 'sub_02',
        subjectName: 'Database Management Systems',
        date: getDateOffset(5),
        records: {
          std_01: 'P', std_02: 'P', std_03: 'P', std_04: 'P',
          std_05: 'A', std_06: 'P', std_07: 'A', std_08: 'P',
        },
        totalStudents: 8,
        presentCount: 6,
        absentCount: 2,
        notes: 'SQL Joins, Views & Indexing',
        createdAt: new Date().toISOString(),
      },
    ];

    await AsyncStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(sampleStudents));
    await AsyncStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(sampleSubjects));
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sampleSessions));
    await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    return { sampleStudents, sampleSubjects, sampleSessions };
  } catch (error) {
    console.error('Error seeding sample data:', error);
    throw error;
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.STUDENTS);
    await AsyncStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    await AsyncStorage.removeItem(STORAGE_KEYS.SESSIONS);
    await AsyncStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
};
