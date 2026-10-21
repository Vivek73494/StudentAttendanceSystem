import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, SIZES } from './src/constants/theme';
import { STORAGE_KEYS, seedSampleData } from './src/services/storage';

import DashboardScreen from './src/screens/DashboardScreen';
import StudentsScreen from './src/screens/StudentsScreen';
import SubjectsScreen from './src/screens/SubjectsScreen';
import MarkAttendanceScreen from './src/screens/MarkAttendanceScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  // Check if initial sample data has ever been seeded
  useEffect(() => {
    const initializeSampleData = async () => {
      try {
        const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
        if (!initialized) {
          // Seed initial MCA college sample dataset on first launch
          await seedSampleData();
        }
      } catch (err) {
        console.error('Initial setup error:', err);
      }
    };

    initializeSampleData();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor={COLORS.white} />
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Dashboard"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarItemStyle: styles.tabBarItem,
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              switch (route.name) {
                case 'Dashboard':
                  iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                  break;
                case 'Students':
                  iconName = focused ? 'people' : 'people-outline';
                  break;
                case 'Subjects':
                  iconName = focused ? 'book' : 'book-outline';
                  break;
                case 'Mark Attendance':
                  iconName = focused ? 'checkbox' : 'checkbox-outline';
                  break;
                case 'Attendance Reports':
                  iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                  break;
                default:
                  iconName = 'cube';
              }

              return <Ionicons name={iconName} size={22} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ tabBarLabel: 'Dashboard' }}
          />
          <Tab.Screen
            name="Students"
            component={StudentsScreen}
            options={{ tabBarLabel: 'Students' }}
          />
          <Tab.Screen
            name="Subjects"
            component={SubjectsScreen}
            options={{ tabBarLabel: 'Subjects' }}
          />
          <Tab.Screen
            name="Mark Attendance"
            component={MarkAttendanceScreen}
            options={{ tabBarLabel: 'Mark' }}
          />
          <Tab.Screen
            name="Attendance Reports"
            component={ReportsScreen}
            options={{ tabBarLabel: 'Reports' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  tabBarItem: {
    paddingVertical: 2,
  },
});
