import { View, ActivityIndicator } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const TAB_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: '#1E73CE',
  tabBarInactiveTintColor: '#95A2B6',
  tabBarStyle: { borderTopColor: '#EEF2F8', borderTopWidth: 1, height: 64, backgroundColor: '#FFFFFF' },
  tabBarLabelStyle: { fontSize: 11, fontFamily: 'PublicSans_700Bold', paddingBottom: 4 },
};

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const role = user?.role;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={TAB_OPTIONS}>
      {/* ── Student tabs ── */}
      <Tabs.Screen
        name="student/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'student' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Counselor',
          href: role === 'student' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="student/requests" options={{ href: null }} />
      <Tabs.Screen name="student/messages" options={{ href: null }} />
      <Tabs.Screen name="student/meetings" options={{ href: null }} />
      <Tabs.Screen name="student/guidance" options={{ href: null }} />

      {/* ── Counselor tabs ── */}
      <Tabs.Screen
        name="counselor/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'counselor' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="counselor/students"
        options={{
          title: 'Students',
          href: role === 'counselor' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="counselor/messages"
        options={{
          title: 'Messages',
          href: role === 'counselor' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="counselor/meetings"
        options={{
          title: 'Meetings',
          href: role === 'counselor' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="counselor/guidance"
        options={{
          title: 'Guidance',
          href: role === 'counselor' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'book' : 'book-outline'} size={22} color={color} />,
        }}
      />

      {/* ── Teacher tabs ── */}
      <Tabs.Screen
        name="teacher/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teacher/students"
        options={{
          title: 'Students',
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teacher/messages"
        options={{
          title: 'Messages',
          href: role === 'teacher' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />,
        }}
      />

      {/* ── Parent tabs ── */}
      <Tabs.Screen
        name="parent/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'parent' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="parent/children"
        options={{
          title: 'Children',
          href: role === 'parent' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="parent/messages"
        options={{
          title: 'Messages',
          href: role === 'parent' ? undefined : null,
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />,
        }}
      />

      {/* ── Shared screens ── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />,
        }}
      />

      {/* Navigatable screens — not shown as tabs */}
      <Tabs.Screen name="home" options={{ href: null }} />
    </Tabs>
  );
}
