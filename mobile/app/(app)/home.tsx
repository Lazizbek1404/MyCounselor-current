import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  counselor: 'School Counselor',
  teacher: 'Teacher',
  parent: 'Parent',
};

const QUICK_ACTIONS = [
  { label: 'AI Counselor', subtitle: 'Chat with your AI advisor', route: '/(app)/chat' as const },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.name}>{user?.firstName ?? 'Welcome'}</Text>
          {user?.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{ROLE_LABELS[user.role]}</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email ?? '—'}</Text>
          </View>
          {user?.schoolName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>School</Text>
              <Text style={styles.infoValue}>{user.schoolName}</Text>
            </View>
          )}
          {user?.gradeLevel && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Grade</Text>
              <Text style={styles.infoValue}>{user.gradeLevel}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.route)}
          >
            <View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
});
