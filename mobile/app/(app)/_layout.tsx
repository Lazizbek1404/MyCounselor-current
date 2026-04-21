import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';

function TabIcon({ focused, color, children }: { focused: boolean; color: string; children: string }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <View>
        {/* Simple text-based icons — swap for a real icon library later */}
      </View>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIcon, { backgroundColor: color }]} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Counselor',
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIcon, { backgroundColor: color }]} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <View style={[styles.tabIcon, { backgroundColor: color }]} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  iconFocused: {
    backgroundColor: '#eff6ff',
  },
  tabIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    opacity: 0.8,
  },
});
