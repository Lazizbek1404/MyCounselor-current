import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const AVATAR_PALETTE = ['#2C7FD6','#199FB0','#E0785A','#7C6CD6','#27A869','#E2A437','#5C6B82'];
function getAvatarBg(name: string) {
  let h = 0; for (let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

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

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || '?';
  const avatarBg = getAvatarBg(fullName);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
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
    backgroundColor: '#F4F7FB',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#17233D',
  },
  roleBadge: {
    backgroundColor: '#E2EEFB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
    marginBottom: 28,
  },
  roleText: {
    fontSize: 13,
    fontFamily: 'PublicSans_600SemiBold',
    color: '#1E73CE',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    width: '100%',
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F7FB',
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'PublicSans_500Medium',
    color: '#64728A',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'PublicSans_500Medium',
    color: '#17233D',
    maxWidth: '60%',
    textAlign: 'right',
  },
  logoutButton: {
    marginTop: 32,
    width: '100%',
    backgroundColor: '#E5483B',
    borderRadius: 9,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#fff',
  },
});
