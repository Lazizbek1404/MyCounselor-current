import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  counselor: 'School Counselor',
  teacher: 'Teacher',
  parent: 'Parent',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
          </Text>
        </View>

        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[user.role]}</Text>
        </View>

        {/* Details */}
        <View style={styles.card}>
          {[
            { label: 'Email', value: user.email },
            user.schoolName ? { label: 'School', value: user.schoolName } : null,
            user.gradeLevel ? { label: 'Grade', value: user.gradeLevel } : null,
            user.title ? { label: 'Title', value: user.title } : null,
          ]
            .filter(Boolean)
            .map((row) => (
              <View key={row!.label} style={styles.row}>
                <Text style={styles.rowLabel}>{row!.label}</Text>
                <Text style={styles.rowValue}>{row!.value}</Text>
              </View>
            ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  roleBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 28,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  rowValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
  logoutButton: {
    marginTop: 32,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
});
