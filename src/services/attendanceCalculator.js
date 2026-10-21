// Attendance calculation and statistics utility
// Formula: Attendance Percentage = (Classes Attended / Total Classes) * 100
// Displays 0% when total classes === 0

export const THRESHOLD_PERCENTAGE = 75.0;

/**
 * Format percentage to 1 decimal place with '%' symbol
 */
export const formatPercentage = (percentage) => {
  if (percentage === undefined || percentage === null || isNaN(percentage)) {
    return '0.0%';
  }
  return `${Number(percentage).toFixed(1)}%`;
};

/**
 * Calculates attendance statistics for a single student in a specific subject
 */
export const getStudentSubjectStats = (studentId, subjectId, sessions = []) => {
  const subjectSessions = sessions.filter((s) => s.subjectId === subjectId);
  const totalClasses = subjectSessions.length;

  if (totalClasses === 0) {
    return {
      totalClasses: 0,
      classesAttended: 0,
      classesMissed: 0,
      percentage: 0,
      formattedPercentage: '0.0%',
      isBelow75: false,
      hasRecords: false,
    };
  }

  let classesAttended = 0;
  subjectSessions.forEach((session) => {
    if (session.records && session.records[studentId] === 'P') {
      classesAttended += 1;
    }
  });

  const classesMissed = totalClasses - classesAttended;
  const percentage = (classesAttended / totalClasses) * 100;
  const roundedPercentage = Math.round(percentage * 10) / 10;

  return {
    totalClasses,
    classesAttended,
    classesMissed,
    percentage: roundedPercentage,
    formattedPercentage: `${roundedPercentage.toFixed(1)}%`,
    isBelow75: roundedPercentage < THRESHOLD_PERCENTAGE,
    hasRecords: true,
  };
};

/**
 * Calculates overall attendance statistics for a single student across all subjects
 */
export const getStudentOverallStats = (studentId, sessions = [], subjects = []) => {
  const totalClasses = sessions.length;

  // Breakdown per subject
  const subjectBreakdown = subjects.map((subject) => {
    const stats = getStudentSubjectStats(studentId, subject.id, sessions);
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      ...stats,
    };
  });

  if (totalClasses === 0) {
    return {
      totalClasses: 0,
      classesAttended: 0,
      classesMissed: 0,
      percentage: 0,
      formattedPercentage: '0.0%',
      isBelow75: false,
      hasAnySubjectBelow75: false,
      lowSubjects: [],
      subjectBreakdown,
      hasRecords: false,
    };
  }

  let classesAttended = 0;
  sessions.forEach((session) => {
    if (session.records && session.records[studentId] === 'P') {
      classesAttended += 1;
    }
  });

  const classesMissed = totalClasses - classesAttended;
  const percentage = (classesAttended / totalClasses) * 100;
  const roundedPercentage = Math.round(percentage * 10) / 10;

  const lowSubjects = subjectBreakdown.filter(
    (s) => s.hasRecords && s.percentage < THRESHOLD_PERCENTAGE
  );

  return {
    totalClasses,
    classesAttended,
    classesMissed,
    percentage: roundedPercentage,
    formattedPercentage: `${roundedPercentage.toFixed(1)}%`,
    isBelow75: roundedPercentage < THRESHOLD_PERCENTAGE,
    hasAnySubjectBelow75: lowSubjects.length > 0,
    lowSubjects,
    subjectBreakdown,
    hasRecords: true,
  };
};

/**
 * Calculates attendance statistics for a subject across all students
 */
export const getSubjectSummaryStats = (subjectId, students = [], sessions = []) => {
  const subjectSessions = sessions.filter((s) => s.subjectId === subjectId);
  const totalClasses = subjectSessions.length;

  const studentStats = students.map((student) => {
    const stats = getStudentSubjectStats(student.id, subjectId, sessions);
    return {
      student,
      ...stats,
    };
  });

  const lowAttendanceStudents = studentStats.filter(
    (s) => totalClasses > 0 && s.percentage < THRESHOLD_PERCENTAGE
  );

  return {
    subjectId,
    totalClasses,
    studentStats,
    lowAttendanceCount: lowAttendanceStudents.length,
    lowAttendanceStudents,
  };
};

/**
 * Calculates comprehensive dashboard statistics
 */
export const getDashboardStats = (students = [], subjects = [], sessions = [], selectedDateString = null) => {
  const todayStr = selectedDateString || new Date().toISOString().split('T')[0];

  const totalStudents = students.length;
  const totalSubjects = subjects.length;
  const totalSessions = sessions.length;

  // Filter sessions marked for "today"
  const todaySessions = sessions.filter((s) => s.date === todayStr);

  let todayPresent = 0;
  let todayAbsent = 0;
  todaySessions.forEach((session) => {
    todayPresent += session.presentCount || 0;
    todayAbsent += session.absentCount || 0;
  });

  // Calculate students with attendance below 75%
  // A student is considered below 75% if their overall attendance is < 75%
  // (where at least one session exists)
  const studentsWithStats = students.map((student) => {
    const stats = getStudentOverallStats(student.id, sessions, subjects);
    return {
      student,
      ...stats,
    };
  });

  // Students below 75% overall
  const studentsBelow75 = studentsWithStats.filter(
    (item) => item.hasRecords && item.percentage < THRESHOLD_PERCENTAGE
  );

  // Overall college attendance percentage across all sessions
  let totalAttendancesPossible = 0;
  let totalAttendancesMarkedPresent = 0;
  sessions.forEach((s) => {
    totalAttendancesPossible += (s.presentCount || 0) + (s.absentCount || 0);
    totalAttendancesMarkedPresent += s.presentCount || 0;
  });

  const overallAverage =
    totalAttendancesPossible > 0
      ? Math.round((totalAttendancesMarkedPresent / totalAttendancesPossible) * 1000) / 10
      : 0;

  return {
    totalStudents,
    totalSubjects,
    totalSessions,
    todayPresent,
    todayAbsent,
    todaySessionsCount: todaySessions.length,
    todayDate: todayStr,
    studentsBelow75Count: studentsBelow75.length,
    studentsBelow75List: studentsBelow75,
    overallAverage,
    formattedOverallAverage: `${overallAverage.toFixed(1)}%`,
    studentsWithStats,
  };
};

/**
 * Format a Date object or YYYY-MM-DD string into user-friendly format (e.g. 18 Oct 2026)
 */
export const formatDateDisplay = (dateString) => {
  if (!dateString) return '';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return dateString;
  } catch {
    return dateString;
  }
};
