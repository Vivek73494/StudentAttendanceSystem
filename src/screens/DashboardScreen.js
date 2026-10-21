import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import CustomButton from '../components/CustomButton';
import {
  getStudents,
  getSubjects,
  getSessions,
  seedSampleData,
  clearAllData,
} from '../services/storage';
import {
  getDashboardStats,
  formatDateDisplay,
} from '../services/attendanceCalculator';

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSubjects: 0,
    totalSessions: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todaySessionsCount: 0,
    todayDate: new Date().toISOString().split('T')[0],
    studentsBelow75Count: 0,
    studentsBelow75List: [],
    overallAverage: 0,
    formattedOverallAverage: '0.0%',
    studentsWithStats: [],
  });
  const [recentSessions, setRecentSessions] = useState([]);

  const loadData = async () => {
    try {
      const [students, subjects, sessions] = await Promise.all([
        getStudents(),
        getSubjects(),
        getSessions(),
      ]);

      const dashboardStats = getDashboardStats(students, subjects, sessions);
      setStats(dashboardStats);
      setRecentSessions(sessions.slice(0, 4));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSeedData = () => {
    Alert.alert(
      'Load Sample MCA Data?',
      'This will populate 8 sample students, 4 subjects, and realistic attendance sessions for testing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Demo Data',
          onPress: async () => {
            try {
              setLoading(true);
              await seedSampleData();
              await loadData();
              Alert.alert('Success', 'Sample MCA data loaded successfully!');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to seed sample data.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data?',
      'This will erase all students, subjects, and attendance sessions permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await clearAllData();
              await loadData();
              Alert.alert('Cleared', 'All attendance records and data have been wiped.');
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to reset data.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Academic Banner */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            <Ionicons name="school" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.appTitle}>MCA Attendance</Text>
            <Text style={styles.headerSubtitle}>Student Management Portal</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.demoBtn}
          onPress={handleSeedData}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={16} color={COLORS.primary} style={{ marginRight: 4 }} />
          <Text style={styles.demoBtnText}>Sample Data</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Date & Overall Status Banner */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.todayLabel}>Today's Summary</Text>
            <Text style={styles.todayDateText}>{formatDateDisplay(stats.todayDate)}</Text>
            <Text style={styles.welcomeSubtext}>
              {stats.todaySessionsCount > 0
                ? `${stats.todaySessionsCount} session(s) conducted today`
                : 'No attendance marked yet today'}
            </Text>
          </View>
          <View style={styles.overallCircle}>
            <Text style={styles.overallPercentText}>{stats.formattedOverallAverage}</Text>
            <Text style={styles.overallPercentSub}>Avg. Attendance</Text>
          </View>
        </View>

        {/* 5 Key Metric Cards */}
        <Text style={styles.sectionHeader}>Overview Metrics</Text>
        <View style={styles.statsGrid}>
          {/* Row 1: Students & Subjects */}
          <View style={styles.gridRow}>
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon="people"
              color={COLORS.primary}
              bgColor={COLORS.primarySubtle}
              subtext="Registered in system"
              style={styles.gridCard}
              onPress={() => navigation.navigate('Students')}
            />
            <StatCard
              title="Total Subjects"
              value={stats.totalSubjects}
              icon="book"
              color="#0284C7"
              bgColor="#E0F2FE"
              subtext="Active courses"
              style={styles.gridCard}
              onPress={() => navigation.navigate('Subjects')}
            />
          </View>

          {/* Row 2: Today's Present & Absent */}
          <View style={styles.gridRow}>
            <StatCard
              title="Today's Present"
              value={stats.todayPresent}
              icon="checkmark-circle"
              color={COLORS.success}
              bgColor={COLORS.successLight}
              subtext={stats.todaySessionsCount > 0 ? 'Across today sessions' : 'No classes today'}
              style={styles.gridCard}
            />
            <StatCard
              title="Today's Absent"
              value={stats.todayAbsent}
              icon="close-circle"
              color={COLORS.danger}
              bgColor={COLORS.dangerLight}
              subtext={stats.todaySessionsCount > 0 ? 'Across today sessions' : 'No classes today'}
              style={styles.gridCard}
            />
          </View>

          {/* Row 3: Total Sessions & Low Attendance (<75%) */}
          <View style={styles.gridRow}>
            <StatCard
              title="Total Sessions"
              value={stats.totalSessions}
              icon="calendar"
              color="#7C3AED"
              bgColor="#F3E8FF"
              subtext="Recorded to date"
              style={styles.gridCard}
              onPress={() => navigation.navigate('Attendance Reports')}
            />
            <StatCard
              title="Below 75%"
              value={stats.studentsBelow75Count}
              icon="alert-circle"
              color={stats.studentsBelow75Count > 0 ? COLORS.danger : COLORS.success}
              bgColor={stats.studentsBelow75Count > 0 ? COLORS.dangerLight : COLORS.successLight}
              subtext="Students with shortage"
              style={styles.gridCard}
              onPress={() => navigation.navigate('Attendance Reports')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <CustomButton
            title="Mark Attendance"
            icon="checkbox"
            variant="primary"
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Mark Attendance')}
          />
          <CustomButton
            title="View Reports"
            icon="bar-chart"
            variant="secondary"
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Attendance Reports')}
          />
        </View>

        {/* Students Below 75% Section */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="warning" size={18} color={COLORS.warningDark} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Attendance Shortage Alert (&lt; 75%)</Text>
            </View>
            <Badge
              label={`${stats.studentsBelow75Count} Student${stats.studentsBelow75Count === 1 ? '' : 's'}`}
              type={stats.studentsBelow75Count > 0 ? 'danger' : 'success'}
              size="small"
            />
          </View>

          {stats.studentsBelow75List.length === 0 ? (
            <View style={styles.emptyCardContent}>
              <Ionicons name="checkmark-done-circle" size={32} color={COLORS.success} />
              <Text style={styles.goodStandingText}>
                {stats.totalSessions === 0
                  ? 'No attendance sessions marked yet. Mark attendance to calculate shortages.'
                  : 'All students currently maintain 75% or higher overall attendance!'}
              </Text>
            </View>
          ) : (
            stats.studentsBelow75List.map((item) => (
              <View key={item.student.id} style={styles.alertStudentItem}>
                <View style={styles.alertStudentLeft}>
                  <Text style={styles.alertStudentName}>{item.student.name}</Text>
                  <Text style={styles.alertStudentSub}>
                    Roll: {item.student.rollNumber} • {item.student.semester}
                  </Text>
                  <Text style={styles.alertStudentClasses}>
                    Attended: {item.classesAttended} / {item.totalClasses} classes ({item.classesMissed} missed)
                  </Text>
                </View>
                <View style={styles.alertStudentRight}>
                  <Badge
                    label={`${item.percentage.toFixed(1)}%`}
                    type="danger"
                  />
                  <Text style={styles.shortageText}>Shortage</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Attendance Sessions */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="time" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Recent Attendance Sessions</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Attendance Reports')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentSessions.length === 0 ? (
            <View style={styles.emptyCardContent}>
              <Ionicons name="calendar-outline" size={32} color={COLORS.textMuted} />
              <Text style={styles.emptySessionText}>
                No attendance sessions recorded yet.
              </Text>
              <CustomButton
                title="Mark First Session"
                icon="add-circle"
                variant="primary"
                size="small"
                style={{ marginTop: 10 }}
                onPress={() => navigation.navigate('Mark Attendance')}
              />
            </View>
          ) : (
            recentSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={styles.sessionItem}
                activeOpacity={0.7}
                onPress={() => {
                  navigation.navigate('Mark Attendance', {
                    editSessionId: session.id,
                    subjectId: session.subjectId,
                    date: session.date,
                  });
                }}
              >
                <View style={styles.sessionDateBadge}>
                  <Text style={styles.sessionDay}>
                    {session.date.split('-')[2]}
                  </Text>
                  <Text style={styles.sessionMonth}>
                    {new Date(session.date).toLocaleString('default', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionSubjectName} numberOfLines={1}>
                    {session.subjectName}
                  </Text>
                  <View style={styles.sessionCounts}>
                    <View style={styles.countBadgeP}>
                      <Text style={styles.countTextP}>P: {session.presentCount || 0}</Text>
                    </View>
                    <View style={styles.countBadgeA}>
                      <Text style={styles.countTextA}>A: {session.absentCount || 0}</Text>
                    </View>
                    <Text style={styles.totalSessionStudents}>
                      Total: {(session.presentCount || 0) + (session.absentCount || 0)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Reset / Clean Data Option */}
        <View style={styles.footerOptions}>
          <TouchableOpacity onPress={handleResetData} style={styles.resetBtn}>
            <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.resetBtnText}>Clear All App Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  appTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  demoBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  welcomeLeft: {
    flex: 1,
    paddingRight: 12,
  },
  todayLabel: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  todayDateText: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginVertical: 4,
  },
  welcomeSubtext: {
    fontSize: SIZES.xs,
    color: '#DBEAFE',
  },
  overallCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 50,
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  overallPercentText: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: COLORS.white,
  },
  overallPercentSub: {
    fontSize: 9,
    color: '#BFDBFE',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
  },
  cardSection: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 18,
    ...SHADOWS.small,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  goodStandingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  emptySessionText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  alertStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  alertStudentLeft: {
    flex: 1,
    paddingRight: 10,
  },
  alertStudentName: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  alertStudentSub: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  alertStudentClasses: {
    fontSize: SIZES.xs,
    color: COLORS.dangerDark,
    marginTop: 2,
    fontWeight: '500',
  },
  alertStudentRight: {
    alignItems: 'flex-end',
  },
  shortageText: {
    fontSize: SIZES.xs,
    color: COLORS.danger,
    fontWeight: '600',
    marginTop: 2,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  sessionDateBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.primarySubtle,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionDay: {
    fontSize: SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    lineHeight: 18,
  },
  sessionMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionSubjectName: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sessionCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadgeP: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  countTextP: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.successDark,
  },
  countBadgeA: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  countTextA: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.dangerDark,
  },
  totalSessionStudents: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  footerOptions: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  resetBtnText: {
    fontSize: SIZES.xs,
    color: COLORS.textMuted,
  },
});
