import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import CustomButton from '../components/CustomButton';
import EmptyState from '../components/EmptyState';
import {
  getStudents,
  getSubjects,
  getSessions,
  saveSession,
} from '../services/storage';
import { formatDateDisplay } from '../services/attendanceCalculator';

const getTodayString = () => new Date().toISOString().split('T')[0];

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export default function MarkAttendanceScreen({ navigation, route }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [date, setDate] = useState(getTodayString());
  const [records, setRecords] = useState({}); // { [studentId]: 'P' | 'A' }
  const [notes, setNotes] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [customDateInput, setCustomDateInput] = useState(getTodayString());

  // Load students & subjects
  const loadInitialData = async () => {
    try {
      const [studentList, subjectList] = await Promise.all([
        getStudents(),
        getSubjects(),
      ]);

      setStudents(studentList);
      setSubjects(subjectList);

      // Check route params (if navigating to edit a specific session)
      const paramSubjectId = route?.params?.subjectId;
      const paramDate = route?.params?.date;
      const paramEditId = route?.params?.editSessionId;

      let activeSubject = null;
      if (paramSubjectId && subjectList.length > 0) {
        activeSubject = subjectList.find((s) => s.id === paramSubjectId) || subjectList[0];
      } else if (!selectedSubject && subjectList.length > 0) {
        activeSubject = subjectList[0];
      } else {
        activeSubject = selectedSubject;
      }

      const activeDate = paramDate || date;
      setSelectedSubject(activeSubject);
      setDate(activeDate);

      // Check if session already exists for this subject & date
      if (activeSubject) {
        await checkExistingSession(activeSubject.id, activeDate, studentList, paramEditId);
      }
    } catch (err) {
      console.error('Error loading attendance data:', err);
      Alert.alert('Error', 'Failed to load attendance form.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [route?.params?.editSessionId, route?.params?.date, route?.params?.subjectId])
  );

  // Check if session exists for selected subject and date
  const checkExistingSession = async (subId, sessionDate, currentStudentList, explicitSessionId = null) => {
    try {
      const sessions = await getSessions();
      let match = null;

      if (explicitSessionId) {
        match = sessions.find((s) => s.id === explicitSessionId);
      }

      if (!match) {
        match = sessions.find((s) => s.subjectId === subId && s.date === sessionDate);
      }

      const baseRecords = {};
      const studentSource = currentStudentList || students;

      if (match) {
        // Load existing session for editing
        setCurrentSessionId(match.id);
        setIsEditingExisting(true);
        setNotes(match.notes || '');

        studentSource.forEach((st) => {
          baseRecords[st.id] = match.records && match.records[st.id] ? match.records[st.id] : 'P';
        });
        setRecords(baseRecords);
      } else {
        // New session: default all students to Present ('P')
        setCurrentSessionId(null);
        setIsEditingExisting(false);
        setNotes('');

        studentSource.forEach((st) => {
          baseRecords[st.id] = 'P';
        });
        setRecords(baseRecords);
      }
    } catch (err) {
      console.error('Error checking existing session:', err);
    }
  };

  // Change subject
  const handleSelectSubject = (subj) => {
    setSelectedSubject(subj);
    setSubjectPickerVisible(false);
    checkExistingSession(subj.id, date, students);
  };

  // Change date
  const handleChangeDate = (newDate) => {
    setDate(newDate);
    if (selectedSubject) {
      checkExistingSession(selectedSubject.id, newDate, students);
    }
  };

  const handleCustomDateSubmit = () => {
    const trimmed = customDateInput.trim();
    // Validate YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(trimmed)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }
    setDateModalVisible(false);
    handleChangeDate(trimmed);
  };

  // Toggle single student status
  const toggleStudentStatus = (studentId, status) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  // Mark all present
  const markAllPresent = () => {
    const updated = {};
    students.forEach((st) => {
      updated[st.id] = 'P';
    });
    setRecords(updated);
  };

  // Mark all absent
  const markAllAbsent = () => {
    const updated = {};
    students.forEach((st) => {
      updated[st.id] = 'A';
    });
    setRecords(updated);
  };

  // Calculate live counts
  const presentCount = Object.values(records).filter((r) => r === 'P').length;
  const absentCount = Object.values(records).filter((r) => r === 'A').length;
  const totalCount = students.length;

  // Save attendance session
  const handleSaveAttendance = async () => {
    if (!selectedSubject) {
      Alert.alert('Subject Required', 'Please select a subject to mark attendance.');
      return;
    }
    if (!date) {
      Alert.alert('Date Required', 'Please select a date.');
      return;
    }
    if (students.length === 0) {
      Alert.alert('No Students', 'Please add students before marking attendance.');
      return;
    }

    try {
      setSaving(true);

      const sessionPayload = {
        id: currentSessionId,
        subjectId: selectedSubject.id,
        subjectName: `${selectedSubject.code} - ${selectedSubject.name}`,
        date,
        records,
        notes: notes.trim(),
      };

      const saved = await saveSession(sessionPayload);
      setCurrentSessionId(saved.id);
      setIsEditingExisting(true);

      Alert.alert(
        'Attendance Saved!',
        `Saved for ${selectedSubject.code} on ${formatDateDisplay(date)}.\nPresent: ${saved.presentCount} | Absent: ${saved.absentCount}`,
        [
          { text: 'View Dashboard', onPress: () => navigation.navigate('Dashboard') },
          { text: 'View Reports', onPress: () => navigation.navigate('Attendance Reports') },
          { text: 'Continue Here', style: 'cancel' },
        ]
      );
    } catch (err) {
      Alert.alert('Cannot Save', err.message || 'Error occurred while saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  // If no students or subjects exist
  if (students.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Mark Attendance</Text>
        </View>
        <EmptyState
          icon="people-outline"
          title="No Students Registered"
          description="You need to add students before you can mark attendance."
          actionTitle="Go to Students Screen"
          onAction={() => navigation.navigate('Students')}
        />
      </SafeAreaView>
    );
  }

  if (subjects.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Mark Attendance</Text>
        </View>
        <EmptyState
          icon="book-outline"
          title="No Subjects Created"
          description="You need to add at least one subject before marking attendance."
          actionTitle="Go to Subjects Screen"
          onAction={() => navigation.navigate('Subjects')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Mark Attendance</Text>
          <Text style={styles.screenSubtitle}>
            {isEditingExisting ? 'Editing Saved Session' : 'Record New Attendance'}
          </Text>
        </View>
        {isEditingExisting && (
          <View style={styles.editBadge}>
            <Ionicons name="create" size={12} color={COLORS.primary} style={{ marginRight: 3 }} />
            <Text style={styles.editBadgeText}>Edit Mode</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        {/* Top Controls: Subject & Date Selectors */}
        <View style={styles.controlsCard}>
          {/* Subject Dropdown Trigger */}
          <Text style={styles.controlLabel}>Select Subject</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setSubjectPickerVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name="book" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedSubject
                  ? `${selectedSubject.code}: ${selectedSubject.name}`
                  : 'Select Subject...'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Date Selector Row */}
          <View style={styles.dateSection}>
            <View style={styles.dateLabelRow}>
              <Text style={styles.controlLabel}>Date</Text>
              <Text style={styles.currentDateDisplay}>{formatDateDisplay(date)}</Text>
            </View>
            <View style={styles.datePillsRow}>
              <TouchableOpacity
                style={[styles.datePill, date === getTodayString() && styles.datePillActive]}
                onPress={() => handleChangeDate(getTodayString())}
              >
                <Text style={[styles.datePillText, date === getTodayString() && styles.datePillTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePill, date === getYesterdayString() && styles.datePillActive]}
                onPress={() => handleChangeDate(getYesterdayString())}
              >
                <Text style={[styles.datePillText, date === getYesterdayString() && styles.datePillTextActive]}>
                  Yesterday
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePill,
                  date !== getTodayString() && date !== getYesterdayString() && styles.datePillActive,
                ]}
                onPress={() => {
                  setCustomDateInput(date);
                  setDateModalVisible(true);
                }}
              >
                <Ionicons
                  name="calendar"
                  size={14}
                  color={date !== getTodayString() && date !== getYesterdayString() ? COLORS.white : COLORS.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.datePillText,
                    date !== getTodayString() && date !== getYesterdayString() && styles.datePillTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Banner when session exists */}
          {isEditingExisting && (
            <View style={styles.existingNotice}>
              <Ionicons name="information-circle" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.existingNoticeText}>
                Attendance already saved for this subject and date. Changes will update the existing session.
              </Text>
            </View>
          )}
        </View>

        {/* Live Counters and Quick Actions */}
        <View style={styles.counterCard}>
          <View style={styles.counterLeft}>
            <View style={styles.countBadge}>
              <Text style={styles.countNumberTotal}>{totalCount}</Text>
              <Text style={styles.countLabel}>Total</Text>
            </View>
            <View style={[styles.countBadge, styles.countBadgeP]}>
              <Text style={styles.countNumberP}>{presentCount}</Text>
              <Text style={styles.countLabelP}>Present</Text>
            </View>
            <View style={[styles.countBadge, styles.countBadgeA]}>
              <Text style={styles.countNumberA}>{absentCount}</Text>
              <Text style={styles.countLabelA}>Absent</Text>
            </View>
          </View>

          {/* Quick Mark Buttons */}
          <View style={styles.quickMarkGroup}>
            <TouchableOpacity
              style={styles.quickMarkBtnP}
              onPress={markAllPresent}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={14} color={COLORS.successDark} style={{ marginRight: 4 }} />
              <Text style={styles.quickMarkTextP}>All Present</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickMarkBtnA}
              onPress={markAllAbsent}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color={COLORS.dangerDark} style={{ marginRight: 4 }} />
              <Text style={styles.quickMarkTextA}>All Absent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Student Attendance Marking List */}
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.studentList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const status = records[item.id] || 'P';
            const isPresent = status === 'P';
            const isAbsent = status === 'A';

            return (
              <View style={styles.attendanceCard}>
                <View style={styles.studentDetails}>
                  <View style={styles.indexCircle}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.namesContainer}>
                    <Text style={styles.attendanceStudentName}>{item.name}</Text>
                    <Text style={styles.attendanceStudentRoll}>
                      {item.rollNumber} • {item.semester}
                    </Text>
                  </View>
                </View>

                {/* Present / Absent Segmented Buttons */}
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, isPresent && styles.toggleBtnPresentActive]}
                    onPress={() => toggleStudentStatus(item.id, 'P')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color={isPresent ? COLORS.white : COLORS.textMuted}
                      style={{ marginRight: 2 }}
                    />
                    <Text style={[styles.toggleBtnText, isPresent && styles.toggleBtnTextActive]}>
                      P
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleBtn, isAbsent && styles.toggleBtnAbsentActive]}
                    onPress={() => toggleStudentStatus(item.id, 'A')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="close"
                      size={15}
                      color={isAbsent ? COLORS.white : COLORS.textMuted}
                      style={{ marginRight: 2 }}
                    />
                    <Text style={[styles.toggleBtnText, isAbsent && styles.toggleBtnTextActive]}>
                      A
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        {/* Bottom Sticky Save Button */}
        <View style={styles.footerSaveContainer}>
          <CustomButton
            title={isEditingExisting ? 'Update Attendance Session' : 'Save Attendance Session'}
            icon="save"
            variant="primary"
            size="large"
            loading={saving}
            onPress={handleSaveAttendance}
          />
        </View>
      </View>

      {/* Subject Picker Modal */}
      <Modal
        visible={subjectPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSubjectPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setSubjectPickerVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {subjects.map((sub) => {
                const isSelected = selectedSubject && selectedSubject.id === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => handleSelectSubject(sub)}
                  >
                    <View style={styles.pickerItemLeft}>
                      <View style={styles.pickerCodeBadge}>
                        <Text style={styles.pickerCodeText}>{sub.code}</Text>
                      </View>
                      <Text style={styles.pickerSubjectTitle} numberOfLines={1}>
                        {sub.name}
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

      {/* Custom Date Input Modal */}
      <Modal
        visible={dateModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Attendance Date</Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dateModalHint}>Enter date in YYYY-MM-DD format:</Text>
            <TextInput
              style={styles.dateTextInput}
              value={customDateInput}
              onChangeText={setCustomDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <View style={styles.dateModalActions}>
              <CustomButton
                title="Cancel"
                variant="subtle"
                style={{ flex: 1 }}
                onPress={() => setDateModalVisible(false)}
              />
              <CustomButton
                title="Apply Date"
                variant="primary"
                style={{ flex: 1 }}
                onPress={handleCustomDateSubmit}
              />
            </View>
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
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  editBadgeText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  contentContainer: {
    flex: 1,
    padding: 14,
  },
  controlsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  controlLabel: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  dropdownText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dateSection: {
    marginTop: 2,
  },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  currentDateDisplay: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  datePillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  datePillText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  datePillTextActive: {
    color: COLORS.white,
  },
  existingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  existingNoticeText: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    flex: 1,
    lineHeight: 16,
  },
  counterCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  counterLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  countBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    minWidth: 44,
  },
  countBadgeP: {
    backgroundColor: COLORS.successLight,
  },
  countBadgeA: {
    backgroundColor: COLORS.dangerLight,
  },
  countNumberTotal: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  countLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  countNumberP: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.successDark,
  },
  countLabelP: {
    fontSize: 9,
    color: COLORS.successDark,
    textTransform: 'uppercase',
  },
  countNumberA: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.dangerDark,
  },
  countLabelA: {
    fontSize: 9,
    color: COLORS.dangerDark,
    textTransform: 'uppercase',
  },
  quickMarkGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  quickMarkBtnP: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickMarkTextP: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successDark,
  },
  quickMarkBtnA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickMarkTextA: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.dangerDark,
  },
  studentList: {
    paddingBottom: 80,
  },
  attendanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  studentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  indexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  namesContainer: {
    flex: 1,
  },
  attendanceStudentName: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  attendanceStudentRoll: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 46,
  },
  toggleBtnPresentActive: {
    backgroundColor: COLORS.success,
  },
  toggleBtnAbsentActive: {
    backgroundColor: COLORS.danger,
  },
  toggleBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  toggleBtnTextActive: {
    color: COLORS.white,
  },
  footerSaveContainer: {
    position: 'absolute',
    bottom: 10,
    left: 14,
    right: 14,
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
  dateModalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.large,
  },
  dateModalHint: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  dateTextInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  dateModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
