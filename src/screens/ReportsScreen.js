import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import CustomButton from '../components/CustomButton';
import {
  getStudents,
  getSubjects,
  getSessions,
  deleteSession,
} from '../services/storage';
import {
  getStudentSubjectStats,
  getStudentOverallStats,
  formatDateDisplay,
  THRESHOLD_PERCENTAGE,
} from '../services/attendanceCalculator';

export default function ReportsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('subject'); // 'subject' | 'student' | 'history'
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Subject report state
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [onlyBelow75Subject, setOnlyBelow75Subject] = useState(false);

  // Student report state
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentPickerVisible, setStudentPickerVisible] = useState(false);

  // History filter
  const [historySubjectFilter, setHistorySubjectFilter] = useState('All');

  const loadData = async () => {
    try {
      const [studentList, subjectList, sessionList] = await Promise.all([
        getStudents(),
        getSubjects(),
        getSessions(),
      ]);

      setStudents(studentList);
      setSubjects(subjectList);
      setSessions(sessionList);

      if (!selectedSubjectId && subjectList.length > 0) {
        setSelectedSubjectId(subjectList[0].id);
      }
      if (!selectedStudentId && studentList.length > 0) {
        setSelectedStudentId(studentList[0].id);
      }
    } catch (err) {
      console.error('Error loading reports data:', err);
      Alert.alert('Error', 'Failed to load attendance report data.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleDeleteSession = (session) => {
    Alert.alert(
      'Delete Session',
      `Delete attendance session for ${session.subjectName} on ${formatDateDisplay(session.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
              await loadData();
              Alert.alert('Deleted', 'Attendance session deleted.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete session.');
            }
          },
        },
      ]
    );
  };

  const handleEditSession = (session) => {
    navigation.navigate('Mark Attendance', {
      editSessionId: session.id,
      subjectId: session.subjectId,
      date: session.date,
    });
  };

  // ==========================================
  // 1. SUBJECT-WISE REPORT TAB
  // ==========================================
  const renderSubjectWiseReport = () => {
    if (subjects.length === 0) {
      return (
        <EmptyState
          icon="book-outline"
          title="No Subjects"
          description="Create subjects first to view subject-wise attendance."
          actionTitle="Add Subject"
          onAction={() => navigation.navigate('Subjects')}
        />
      );
    }

    const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
    const subjectSessions = sessions.filter((s) => s.subjectId === currentSubject.id);
    const totalClassesHeld = subjectSessions.length;

    // Student stats for this subject
    let subjectStudentList = students.map((st) => {
      const stats = getStudentSubjectStats(st.id, currentSubject.id, sessions);
      return {
        student: st,
        ...stats,
      };
    });

    if (onlyBelow75Subject) {
      subjectStudentList = subjectStudentList.filter((item) => item.isBelow75);
    }

    const shortageCount = students.filter(
      (st) => getStudentSubjectStats(st.id, currentSubject.id, sessions).isBelow75
    ).length;

    return (
      <View style={{ flex: 1 }}>
        {/* Horizontal Subject Switcher Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subjectChipsScroll}
          contentContainerStyle={styles.subjectChipsContent}
        >
          {subjects.map((sub) => {
            const isSelected = sub.id === currentSubject.id;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                onPress={() => setSelectedSubjectId(sub.id)}
              >
                <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>
                  {sub.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Current Subject Header Card */}
        <View style={styles.reportSummaryCard}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.codePill}>
                <Text style={styles.codePillText}>{currentSubject.code}</Text>
              </View>
              <Text style={styles.summarySubjectTitle}>{currentSubject.name}</Text>
            </View>
            <View style={styles.totalClassesBadge}>
              <Text style={styles.totalClassesNumber}>{totalClassesHeld}</Text>
              <Text style={styles.totalClassesLabel}>Classes Held</Text>
            </View>
          </View>

          {/* Filter Bar: Toggle Shortage Only */}
          <View style={styles.filterBar}>
            <Text style={styles.shortageCountText}>
              Shortage (&lt;75%):{' '}
              <Text style={{ fontWeight: '700', color: shortageCount > 0 ? COLORS.danger : COLORS.success }}>
                {shortageCount} of {students.length} students
              </Text>
            </Text>

            <TouchableOpacity
              style={[styles.shortageFilterBtn, onlyBelow75Subject && styles.shortageFilterBtnActive]}
              onPress={() => setOnlyBelow75Subject(!onlyBelow75Subject)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={onlyBelow75Subject ? 'checkbox' : 'square-outline'}
                size={16}
                color={onlyBelow75Subject ? COLORS.white : COLORS.danger}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.shortageFilterText, onlyBelow75Subject && styles.shortageFilterTextActive]}>
                Only &lt; 75%
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Student Subject Table / Cards */}
        {subjectStudentList.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={onlyBelow75Subject ? 'No Shortages!' : 'No Students'}
            description={
              onlyBelow75Subject
                ? 'Great news! All students have 75% or higher attendance in this subject.'
                : 'No students registered in the system.'
            }
          />
        ) : (
          <FlatList
            data={subjectStudentList}
            keyExtractor={(item) => item.student.id}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.studentReportCard}>
                <View style={styles.reportCardRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.reportStudentName}>{item.student.name}</Text>
                    <Text style={styles.reportStudentSub}>
                      Roll: {item.student.rollNumber} • {item.student.semester}
                    </Text>
                  </View>

                  <Badge
                    label={item.formattedPercentage}
                    type={!item.hasRecords ? 'neutral' : item.isBelow75 ? 'danger' : 'success'}
                  />
                </View>

                {/* Attended, Missed, Total Details */}
                <View style={styles.classesDetailsGrid}>
                  <View style={styles.classDetailCol}>
                    <Text style={styles.classDetailNum}>{item.classesAttended}</Text>
                    <Text style={styles.classDetailLbl}>Attended</Text>
                  </View>
                  <View style={styles.classDetailCol}>
                    <Text style={[styles.classDetailNum, { color: COLORS.dangerDark }]}>
                      {item.classesMissed}
                    </Text>
                    <Text style={styles.classDetailLbl}>Missed</Text>
                  </View>
                  <View style={styles.classDetailCol}>
                    <Text style={styles.classDetailNum}>{item.totalClasses}</Text>
                    <Text style={styles.classDetailLbl}>Total Classes</Text>
                  </View>
                </View>

                {/* Visual Progress Bar */}
                {item.hasRecords && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: item.isBelow75 ? COLORS.danger : COLORS.success,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    );
  };

  // ==========================================
  // 2. STUDENT-WISE REPORT TAB
  // ==========================================
  const renderStudentWiseReport = () => {
    if (students.length === 0) {
      return (
        <EmptyState
          icon="people-outline"
          title="No Students"
          description="Register students first to view individual attendance reports."
          actionTitle="Add Student"
          onAction={() => navigation.navigate('Students')}
        />
      );
    }

    const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
    const overallStats = getStudentOverallStats(currentStudent.id, sessions, subjects);

    // Sessions history specifically for this student
    const studentSessionLogs = sessions.map((sess) => ({
      ...sess,
      studentStatus: sess.records ? sess.records[currentStudent.id] || 'A' : 'A',
    }));

    return (
      <ScrollView contentContainerStyle={styles.listPadding} showsVerticalScrollIndicator={false}>
        {/* Student Selector Card */}
        <TouchableOpacity
          style={styles.studentSelectDropdown}
          onPress={() => setStudentPickerVisible(true)}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.selectLabel}>Selected Student</Text>
            <Text style={styles.selectStudentName}>
              {currentStudent.name} ({currentStudent.rollNumber})
            </Text>
          </View>
          <Ionicons name="swap-vertical" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Student Profile & Overall Attendance Summary Card */}
        <View style={styles.studentProfileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarBig}>
              <Text style={styles.avatarBigText}>
                {currentStudent.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{currentStudent.name}</Text>
              <Text style={styles.profileSub}>
                Roll No: {currentStudent.rollNumber} • {currentStudent.semester}
              </Text>
            </View>
            <View style={styles.percentBox}>
              <Text
                style={[
                  styles.overallPercentBig,
                  { color: overallStats.isBelow75 ? COLORS.danger : COLORS.success },
                ]}
              >
                {overallStats.formattedPercentage}
              </Text>
              <Text style={styles.overallPercentBigLbl}>Overall</Text>
            </View>
          </View>

          {/* Overall Stats Grid */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNum}>{overallStats.classesAttended}</Text>
              <Text style={styles.profileStatLbl}>Classes Attended</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={[styles.profileStatNum, { color: COLORS.dangerDark }]}>
                {overallStats.classesMissed}
              </Text>
              <Text style={styles.profileStatLbl}>Classes Missed</Text>
            </View>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatNum}>{overallStats.totalClasses}</Text>
              <Text style={styles.profileStatLbl}>Total Conducted</Text>
            </View>
          </View>

          {overallStats.isBelow75 && (
            <View style={styles.shortageWarningBanner}>
              <Ionicons name="warning" size={16} color={COLORS.dangerDark} style={{ marginRight: 6 }} />
              <Text style={styles.shortageWarningText}>
                Attendance is below the mandatory 75% college requirement.
              </Text>
            </View>
          )}
        </View>

        {/* Subject-wise Breakdown Table */}
        <Text style={styles.subSectionTitle}>Subject-wise Attendance Breakdown</Text>
        {overallStats.subjectBreakdown.map((item) => (
          <View key={item.subjectId} style={styles.subjectBreakdownCard}>
            <View style={styles.subjectBreakdownHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.breakdownSubCode}>{item.subjectCode}</Text>
                <Text style={styles.breakdownSubName}>{item.subjectName}</Text>
              </View>
              <Badge
                label={item.formattedPercentage}
                type={!item.hasRecords ? 'neutral' : item.isBelow75 ? 'danger' : 'success'}
              />
            </View>

            <View style={styles.breakdownStatsRow}>
              <Text style={styles.breakdownClassesText}>
                Attended: <Text style={{ fontWeight: '700' }}>{item.classesAttended}</Text> of{' '}
                <Text style={{ fontWeight: '700' }}>{item.totalClasses}</Text> classes ({item.classesMissed} missed)
              </Text>
            </View>

            {item.hasRecords && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(item.percentage, 100)}%`,
                        backgroundColor: item.isBelow75 ? COLORS.danger : COLORS.success,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Session Log History for Student */}
        <Text style={styles.subSectionTitle}>Attendance Session History</Text>
        {studentSessionLogs.length === 0 ? (
          <Text style={styles.emptyText}>No attendance sessions recorded yet.</Text>
        ) : (
          studentSessionLogs.map((sess) => {
            const isPresent = sess.studentStatus === 'P';
            return (
              <View key={sess.id} style={styles.historyLogItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyLogDate}>{formatDateDisplay(sess.date)}</Text>
                  <Text style={styles.historyLogSubject}>{sess.subjectName}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: isPresent ? COLORS.successLight : COLORS.dangerLight },
                  ]}
                >
                  <Ionicons
                    name={isPresent ? 'checkmark-circle' : 'close-circle'}
                    size={14}
                    color={isPresent ? COLORS.successDark : COLORS.dangerDark}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isPresent ? COLORS.successDark : COLORS.dangerDark },
                    ]}
                  >
                    {isPresent ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ==========================================
  // 3. SESSION LOGS & HISTORY TAB
  // ==========================================
  const renderHistoryTab = () => {
    let filteredSessions = sessions;
    if (historySubjectFilter !== 'All') {
      filteredSessions = sessions.filter((s) => s.subjectId === historySubjectFilter);
    }

    return (
      <View style={{ flex: 1 }}>
        {/* Subject Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subjectChipsScroll}
          contentContainerStyle={styles.subjectChipsContent}
        >
          <TouchableOpacity
            style={[styles.subjectChip, historySubjectFilter === 'All' && styles.subjectChipActive]}
            onPress={() => setHistorySubjectFilter('All')}
          >
            <Text style={[styles.subjectChipText, historySubjectFilter === 'All' && styles.subjectChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map((sub) => {
            const isSelected = sub.id === historySubjectFilter;
            return (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subjectChip, isSelected && styles.subjectChipActive]}
                onPress={() => setHistorySubjectFilter(sub.id)}
              >
                <Text style={[styles.subjectChipText, isSelected && styles.subjectChipTextActive]}>
                  {sub.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredSessions.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Attendance Sessions"
            description="No attendance records found matching the filter."
            actionTitle="Mark Attendance"
            onAction={() => navigation.navigate('Mark Attendance')}
          />
        ) : (
          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <View style={styles.historyDateBox}>
                    <Text style={styles.historyDateDay}>{item.date.split('-')[2]}</Text>
                    <Text style={styles.historyDateMonth}>
                      {new Date(item.date).toLocaleString('default', { month: 'short' })}
                    </Text>
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.historySubjectTitle}>{item.subjectName}</Text>
                    <Text style={styles.historyDateFull}>{formatDateDisplay(item.date)}</Text>
                    {item.notes ? (
                      <Text style={styles.historyNotesText}>Note: {item.notes}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Counts Summary */}
                <View style={styles.historyCardFooter}>
                  <View style={styles.historyCountRow}>
                    <View style={styles.pCountPill}>
                      <Text style={styles.pCountText}>Present: {item.presentCount || 0}</Text>
                    </View>
                    <View style={styles.aCountPill}>
                      <Text style={styles.aCountText}>Absent: {item.absentCount || 0}</Text>
                    </View>
                    <Text style={styles.totalEnrolledText}>
                      Total: {(item.presentCount || 0) + (item.absentCount || 0)}
                    </Text>
                  </View>

                  <View style={styles.historyActions}>
                    <TouchableOpacity
                      style={styles.editSessionBtn}
                      onPress={() => handleEditSession(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={15} color={COLORS.primary} style={{ marginRight: 3 }} />
                      <Text style={styles.editSessionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteSessionBtn}
                      onPress={() => handleDeleteSession(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={15} color={COLORS.danger} style={{ marginRight: 3 }} />
                      <Text style={styles.deleteSessionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Attendance Reports</Text>
          <Text style={styles.screenSubtitle}>Analytics &amp; Attendance Shortages</Text>
        </View>
      </View>

      {/* 3-Way Segmented Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'subject' && styles.tabItemActive]}
          onPress={() => setActiveTab('subject')}
        >
          <Ionicons
            name="book"
            size={16}
            color={activeTab === 'subject' ? COLORS.primary : COLORS.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'subject' && styles.tabTextActive]}>
            Subject-wise
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'student' && styles.tabItemActive]}
          onPress={() => setActiveTab('student')}
        >
          <Ionicons
            name="person"
            size={16}
            color={activeTab === 'student' ? COLORS.primary : COLORS.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'student' && styles.tabTextActive]}>
            Student-wise
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'history' && styles.tabItemActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time"
            size={16}
            color={activeTab === 'history' ? COLORS.primary : COLORS.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Past Sessions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Content */}
      <View style={styles.content}>
        {activeTab === 'subject' && renderSubjectWiseReport()}
        {activeTab === 'student' && renderStudentWiseReport()}
        {activeTab === 'history' && renderHistoryTab()}
      </View>

      {/* Student Picker Modal */}
      <Modal
        visible={studentPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStudentPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={() => setStudentPickerVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {students.map((st) => {
                const isSelected = selectedStudentId === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      setSelectedStudentId(st.id);
                      setStudentPickerVisible(false);
                    }}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View style={styles.pickerCodeBadge}>
                        <Text style={styles.pickerCodeText}>{st.rollNumber}</Text>
                      </View>
                      <Text style={styles.pickerSubjectTitle} numberOfLines={1}>
                        {st.name} ({st.semester})
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  screenTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  screenSubtitle: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 14,
  },
  subjectChipsScroll: {
    maxHeight: 46,
    marginBottom: 10,
  },
  subjectChipsContent: {
    gap: 8,
    alignItems: 'center',
  },
  subjectChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  subjectChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  subjectChipText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subjectChipTextActive: {
    color: COLORS.white,
  },
  reportSummaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codePill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summarySubjectTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalClassesBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  totalClassesNumber: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  totalClassesLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  shortageCountText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  shortageFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerLight,
  },
  shortageFilterBtnActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  shortageFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dangerDark,
  },
  shortageFilterTextActive: {
    color: COLORS.white,
  },
  listPadding: {
    paddingBottom: 24,
  },
  studentReportCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  reportCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportStudentName: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reportStudentSub: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  classesDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  classDetailCol: {
    alignItems: 'center',
  },
  classDetailNum: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  classDetailLbl: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBg: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  studentSelectDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  selectLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  selectStudentName: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  studentProfileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBig: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarBigText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  profileName: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileSub: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  percentBox: {
    alignItems: 'flex-end',
  },
  overallPercentBig: {
    fontSize: SIZES.xl,
    fontWeight: '800',
  },
  overallPercentBigLbl: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNum: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileStatLbl: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  shortageWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  shortageWarningText: {
    fontSize: 11,
    color: COLORS.dangerDark,
    fontWeight: '600',
    flex: 1,
  },
  subSectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 6,
  },
  subjectBreakdownCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  subjectBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownSubCode: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  breakdownSubName: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  breakdownStatsRow: {
    marginTop: 8,
  },
  breakdownClassesText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  historyLogItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  historyLogDate: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyLogSubject: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginVertical: 8,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDateDay: {
    fontSize: SIZES.md,
    fontWeight: '800',
    color: COLORS.primary,
  },
  historyDateMonth: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  historySubjectTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyDateFull: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  historyNotesText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  historyCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pCountPill: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successDark,
  },
  aCountPill: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dangerDark,
  },
  totalEnrolledText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editSessionText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteSessionText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.primarySubtle,
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickerCodeBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
  },
  pickerCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pickerSubjectTitle: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
});
