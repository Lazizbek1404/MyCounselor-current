import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const ROLES = [
  {
    key: 'student',
    label: 'Student',
    description: 'Access counseling resources and support',
  },
  {
    key: 'counselor',
    label: 'School Counselor',
    description: 'Manage students and provide guidance',
  },
  {
    key: 'teacher',
    label: 'Teacher',
    description: 'Support students and communicate with counselors',
  },
  {
    key: 'parent',
    label: 'Parent',
    description: "Stay informed about your child's progress",
  },
] as const;

export default function SignupScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Select your role to get started</Text>

        {ROLES.map(role => (
          <TouchableOpacity
            key={role.key}
            style={styles.card}
            onPress={() => router.push(`/(auth)/signup-${role.key}` as any)}
          >
            <Text style={styles.cardLabel}>{role.label}</Text>
            <Text style={styles.cardDesc}>{role.description}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.linkBtn}>
          <Text style={styles.link}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  scroll: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  title: { fontSize: 26, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6EBF2',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLabel: { fontSize: 16, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  linkBtn: { marginTop: 24, alignItems: 'center' },
  link: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
});
