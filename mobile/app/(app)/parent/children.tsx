import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

const AVATAR_PALETTE = ['#2C7FD6','#199FB0','#E0785A','#7C6CD6','#27A869','#E2A437','#5C6B82'];
function getAvatarBg(name: string) {
  let h = 0; for (let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

interface LinkedChild {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel?: string;
  schoolName?: string;
  counselorName?: string;
}

export default function ParentChildrenScreen() {
  const { user } = useAuth();

  const [childrenNames, setChildrenNames] = useState<string[]>([]);
  const [studentConfirmed, setStudentConfirmed] = useState(false);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !user?.schoolId) return;

    // Get parent's profile
    const { data: parentData } = await supabase
      .from('profiles')
      .select('children_names,student_confirmed')
      .eq('id', user.id)
      .single();

    if (!parentData) { setLoading(false); setRefreshing(false); return; }

    const names: string[] = parentData.children_names ?? [];
    const confirmed: boolean = !!parentData.student_confirmed;
    setChildrenNames(names);
    setStudentConfirmed(confirmed);

    if (!confirmed || names.length === 0) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Fetch all students and counselors at school in parallel
    const [studentsRes, counselorsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,first_name,last_name,email,grade_level,school_name')
        .eq('school_id', user.schoolId)
        .eq('role', 'student')
        .eq('approved', true),
      supabase
        .from('profiles')
        .select('first_name,last_name')
        .eq('school_id', user.schoolId)
        .eq('role', 'counselor')
        .eq('approved', true),
    ]);

    const matched = (studentsRes.data ?? []).filter(s =>
      names.some(name =>
        name.toLowerCase() === `${s.first_name} ${s.last_name}`.toLowerCase()
      )
    );

    // Use first counselor's name as a representative counselor (school-level)
    const counselors = counselorsRes.data ?? [];
    const counselorName = counselors.length > 0
      ? `${counselors[0].first_name} ${counselors[0].last_name}`
      : undefined;

    setChildren(
      matched.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        gradeLevel: s.grade_level ?? undefined,
        schoolName: s.school_name ?? undefined,
        counselorName,
      }))
    );

    setLoading(false);
    setRefreshing(false);
  }, [user?.id, user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#1E73CE" />
      </SafeAreaView>
    );
  }

  // Not yet confirmed — show instructions
  if (!studentConfirmed) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <Text style={s.headerTitle}>My Children</Text>
        </View>
        <View style={s.instructionsWrapper}>
          <View style={s.instructionsCard}>
            <Text style={s.instructionsTitle}>No confirmed children yet</Text>
            <Text style={s.instructionsText}>
              A student must confirm your link request from their dashboard before they appear here.
            </Text>
            <Text style={s.instructionsText}>
              Make sure the student name you entered during signup matches their registered name exactly (including capitalization).
            </Text>
            {childrenNames.length > 0 && (
              <View style={s.namesBox}>
                <Text style={s.namesLabel}>Names you entered:</Text>
                {childrenNames.map((name, i) => (
                  <Text key={i} style={s.nameItem}>• {name}</Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Children</Text>
        <Text style={s.headerCount}>{children.length} linked</Text>
      </View>

      <FlatList
        data={children}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={s.instructionsWrapper}>
            <View style={s.instructionsCard}>
              <Text style={s.instructionsTitle}>No matching students found</Text>
              <Text style={s.instructionsText}>
                Your link was confirmed, but no approved students matching your entered names were found. The student may not have been approved by a counselor yet.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const fullName = `${item.firstName} ${item.lastName}`;
          return (
            <View style={s.card}>
              {/* Avatar */}
              <View style={[s.avatar, { backgroundColor: getAvatarBg(fullName) }]}>
                <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={s.cardTop}>
                  <Text style={s.cardName}>{fullName}</Text>
                  <View style={s.confirmedBadge}>
                    <Text style={s.confirmedText}>Confirmed</Text>
                  </View>
                </View>

                <View style={s.infoRows}>
                  <View style={s.infoRow}>
                    <Text style={s.infoLabel}>Email</Text>
                    <Text style={s.infoValue}>{item.email}</Text>
                  </View>
                  {item.gradeLevel && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Grade</Text>
                      <Text style={s.infoValue}>{item.gradeLevel}</Text>
                    </View>
                  )}
                  {item.schoolName && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>School</Text>
                      <Text style={s.infoValue}>{item.schoolName}</Text>
                    </View>
                  )}
                  {item.counselorName && (
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>Counselor</Text>
                      <Text style={s.infoValue}>{item.counselorName}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  headerCount: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#64728A' },
  // Instructions
  instructionsWrapper: { flex: 1, padding: 16 },
  instructionsCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  instructionsTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 10 },
  instructionsText: { fontSize: 14, fontFamily: 'PublicSans_400Regular', color: '#36425A', lineHeight: 21, marginBottom: 10 },
  namesBox: { backgroundColor: '#F4F7FB', borderRadius: 8, padding: 12, marginTop: 4 },
  namesLabel: { fontSize: 12, fontFamily: 'PublicSans_600SemiBold', color: '#64728A', marginBottom: 6 },
  nameItem: { fontSize: 14, fontFamily: 'PublicSans_400Regular', color: '#17233D', marginBottom: 2 },
  // Cards
  card: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 },
  cardName: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#17233D', flex: 1 },
  confirmedBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  confirmedText: { fontSize: 11, fontFamily: 'PublicSans_700Bold', color: '#15803d' },
  // Info rows
  infoRows: { gap: 6 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, fontFamily: 'PublicSans_500Medium', color: '#64728A' },
  infoValue: { fontSize: 12, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
});
