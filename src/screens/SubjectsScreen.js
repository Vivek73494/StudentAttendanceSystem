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
import EmptyState from '../components/EmptyState';
import {
  getSubjects,
  saveSubject,
  deleteSubject,
  getSessions,
} from '../services/storage';

export default function SubjectsScreen() {
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [subjectList, sessionList] = await Promise.all([
        getSubjects(),
        getSessions(),
      ]);
      setSubjects(subjectList);
      setSessions(sessionList);
    } catch (error) {
      console.error('Error loading subjects:', error);
      Alert.alert('Error', 'Failed to load subjects.');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const openAddModal = () => {
    setName('');
    setCode('');
    setFormError('');
    setModalVisible(true);
  };

  const handleSaveSubject = async () => {
    if (!name.trim()) {
      setFormError('Please enter subject title.');
      return;
    }
    if (!code.trim()) {
      setFormError('Please enter subject code (e.g. MCA-101).');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      await saveSubject({
        name: name.trim(),
        code: code.trim().toUpperCase(),
      });

      setModalVisible(false);
      await loadData();
      Alert.alert('Success', 'Subject added successfully.');
    } catch (err) {
      setFormError(err.message || 'Error saving subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = (subject) => {
    const classCount = sessions.filter((s) => s.subjectId === subject.id).length;
    const warningMsg = classCount > 0
      ? `Deleting "${subject.name}" will also remove its ${classCount} attendance session(s). Continue?`
      : `Are you sure you want to delete "${subject.name}"?`;

    Alert.alert('Delete Subject', warningMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubject(subject.id);
            await loadData();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete subject.');
          }
        },
      },
    ]);
  };

  const renderSubjectItem = ({ item }) => {
    const classCount = sessions.filter((s) => s.subjectId === item.id).length;

    return (
      <View style={styles.subjectCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="book" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.subjectInfo}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{item.code}</Text>
            </View>
            <Text style={styles.subjectTitle}>{item.name}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.classCountContainer}>
            <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} style={{ marginRight: 5 }} />
            <Text style={styles.classCountText}>
              {classCount} class{classCount === 1 ? '' : 'es'} conducted
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteSubject(item)}
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Subjects</Text>
          <Text style={styles.screenSubtitle}>
            {subjects.length} subject{subjects.length === 1 ? '' : 's'} in curriculum
          </Text>
        </View>
        <CustomButton
          title="Add Subject"
          icon="add"
          variant="primary"
          size="small"
          onPress={openAddModal}
        />
      </View>

      <View style={styles.contentContainer}>
        {subjects.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No Subjects Added"
            description="Add MCA subjects like Data Structures, DBMS, Web Technologies to mark attendance."
            actionTitle="Add Subject"
            onAction={openAddModal}
          />
        ) : (
          <FlatList
            data={subjects}
            keyExtractor={(item) => item.id}
            renderItem={renderSubjectItem}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add Subject Modal */}
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
              <Text style={styles.modalTitle}>Add New Subject</Text>
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

            {/* Subject Code */}
            <Text style={styles.inputLabel}>Subject Code *</Text>
            <TextInput
              style={styles.textInput}
              value={code}
              onChangeText={setCode}
              placeholder="e.g. MCA-101"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
            />
            <Text style={styles.fieldHint}>Must be a unique course code.</Text>

            {/* Subject Title */}
            <Text style={styles.inputLabel}>Subject Title / Name *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Advanced Data Structures"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <CustomButton
                title="Cancel"
                variant="subtle"
                style={styles.modalBtn}
                onPress={() => setModalVisible(false)}
              />
              <CustomButton
                title="Add Subject"
                variant="primary"
                loading={saving}
                style={styles.modalBtn}
                onPress={handleSaveSubject}
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
  listPadding: {
    paddingBottom: 24,
  },
  subjectCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  subjectInfo: {
    flex: 1,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subjectTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  classCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classCountText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
