import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import CustomButton from '../components/CustomButton';
import SearchBar from '../components/SearchBar';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import {
  getStudents,
  saveStudent,
  deleteStudent,
  getSessions,
  getSubjects,
} from '../services/storage';
import {
  getStudentOverallStats,
} from '../services/attendanceCalculator';

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4'];

export default function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('All');
  const [studentStatsMap, setStudentStatsMap] = useState({});

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStudents = async () => {
    try {
      const [studentList, sessions, subjects] = await Promise.all([
        getStudents(),
        getSessions(),
        getSubjects(),
      ]);

      setStudents(studentList);

      // Compute stats map for each student
      const statsMap = {};
      studentList.forEach((st) => {
        statsMap[st.id] = getStudentOverallStats(st.id, sessions, subjects);
      });
      setStudentStatsMap(statsMap);

      filterList(studentList, searchQuery, selectedSemesterFilter);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [])
  );

  const filterList = (list, query, semFilter) => {
    let result = list || students;

    if (semFilter && semFilter !== 'All') {
      result = result.filter((s) => s.semester === semFilter);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.rollNumber.toLowerCase().includes(q)
      );
    }

    setFilteredStudents(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterList(students, text, selectedSemesterFilter);
  };

  const handleSemesterFilterChange = (sem) => {
    setSelectedSemesterFilter(sem);
    filterList(students, searchQuery, sem);
  };

  const openAddModal = () => {
    setEditingStudentId(null);
    setName('');
    setRollNumber('');
    setSemester(SEMESTERS[0]);
    setFormError('');
    setModalVisible(true);
  };

  const openEditModal = (student) => {
    setEditingStudentId(student.id);
    setName(student.name);
    setRollNumber(student.rollNumber);
    setSemester(student.semester || SEMESTERS[0]);
    setFormError('');
    setModalVisible(true);
  };

  const handleSaveStudent = async () => {
    if (!name.trim()) {
      setFormError('Please enter student name.');
      return;
    }
    if (!rollNumber.trim()) {
      setFormError('Please enter roll number.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      await saveStudent({
        id: editingStudentId,
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        semester,
      });

      setModalVisible(false);
      await loadStudents();
      Alert.alert(
        'Success',
        editingStudentId ? 'Student updated successfully.' : 'Student registered successfully.'
      );
    } catch (err) {
      setFormError(err.message || 'Error saving student.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = (student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${student.name} (${student.rollNumber})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStudent(student.id);
              await loadStudents();
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete student.');
            }
          },
        },
      ]
    );
  };

  const renderStudentItem = ({ item }) => {
    const stats = studentStatsMap[item.id] || { percentage: 0, hasRecords: false, classesAttended: 0, totalClasses: 0 };
    const isBelow75 = stats.hasRecords && stats.percentage < 75;

    return (
      <View style={styles.studentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {item.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.name}</Text>
            <View style={styles.rollSemRow}>
              <Text style={styles.rollNumber}>Roll: {item.rollNumber}</Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={styles.semText}>{item.semester}</Text>
            </View>
          </View>

          {/* Attendance Percentage Badge */}
          <View style={styles.percentBadgeContainer}>
            <Badge
              label={stats.hasRecords ? `${stats.percentage.toFixed(1)}%` : 'No classes'}
              type={!stats.hasRecords ? 'neutral' : isBelow75 ? 'danger' : 'success'}
            />
            {isBelow75 && (
              <Text style={styles.shortageLabel}>Shortage</Text>
            )}
          </View>
        </View>

        {stats.hasRecords && (
          <View style={styles.attendanceBarContainer}>
            <View style={styles.attendanceBarBg}>
              <View
                style={[
                  styles.attendanceBarFill,
                  {
                    width: `${Math.min(stats.percentage, 100)}%`,
                    backgroundColor: isBelow75 ? COLORS.danger : COLORS.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.classesCountText}>
              Attended {stats.classesAttended} of {stats.totalClasses} classes
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteStudent(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} style={{ marginRight: 4 }} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Students</Text>
          <Text style={styles.screenSubtitle}>
            {students.length} student{students.length === 1 ? '' : 's'} registered
          </Text>
        </View>
        <CustomButton
          title="Add Student"
          icon="person-add"
          variant="primary"
          size="small"
          onPress={openAddModal}
        />
      </View>

      <View style={styles.contentContainer}>
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search by student name or roll no..."
        />

        {/* Semester Filter Chips */}
        <View style={styles.filterChipRow}>
          {['All', ...SEMESTERS].map((sem) => (
            <TouchableOpacity
              key={sem}
              onPress={() => handleSemesterFilterChange(sem)}
              style={[
                styles.filterChip,
                selectedSemesterFilter === sem && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedSemesterFilter === sem && styles.filterChipTextActive,
                ]}
              >
                {sem}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Student List */}
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={students.length === 0 ? 'person-add-outline' : 'search-outline'}
            title={students.length === 0 ? 'No Students Yet' : 'No Students Match'}
            description={
              students.length === 0
                ? 'Add your first MCA student to start managing attendance.'
                : 'Try adjusting your search query or semester filter.'
            }
            actionTitle={students.length === 0 ? 'Add Student' : null}
            onAction={students.length === 0 ? openAddModal : null}
          />
        ) : (
          <FlatList
            data={filteredStudents}
            keyExtractor={(item) => item.id}
            renderItem={renderStudentItem}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add / Edit Student Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingStudentId ? 'Edit Student Details' : 'Register New Student'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {formError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {/* Student Name */}
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />

            {/* Roll Number */}
            <Text style={styles.inputLabel}>Roll Number *</Text>
            <TextInput
              style={styles.textInput}
              value={rollNumber}
              onChangeText={setRollNumber}
              placeholder="e.g. MCA2401"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
            />
            <Text style={styles.fieldHint}>Roll number must be unique for each student.</Text>

            {/* Semester Selection */}
            <Text style={styles.inputLabel}>Semester *</Text>
            <View style={styles.semesterSelector}>
              {SEMESTERS.map((sem) => (
                <TouchableOpacity
                  key={sem}
                  style={[
                    styles.semOption,
                    semester === sem && styles.semOptionSelected,
                  ]}
                  onPress={() => setSemester(sem)}
                >
                  <Text
                    style={[
                      styles.semOptionText,
                      semester === sem && styles.semOptionTextSelected,
                    ]}
                  >
                    {sem}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <CustomButton
                title="Cancel"
                variant="subtle"
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              />
              <CustomButton
                title={editingStudentId ? 'Save Changes' : 'Register Student'}
                variant="primary"
                loading={saving}
                style={styles.modalBtn}
                onPress={handleSaveStudent}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
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
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  filterChipRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listPadding: {
    paddingBottom: 24,
  },
  studentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rollSemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rollNumber: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  dotSeparator: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
    marginHorizontal: 6,
  },
  semText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  percentBadgeContainer: {
    alignItems: 'flex-end',
  },
  shortageLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
    marginTop: 2,
  },
  attendanceBarContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  attendanceBarBg: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  attendanceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  classesCountText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    gap: 12,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    marginBottom: 14,
  },
  errorText: {
    fontSize: SIZES.xs,
    color: COLORS.dangerDark,
    flex: 1,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 6,
  },
  semesterSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  semOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  semOptionSelected: {
    backgroundColor: COLORS.primarySubtle,
    borderColor: COLORS.primary,
  },
  semOptionText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  semOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
  },
});
