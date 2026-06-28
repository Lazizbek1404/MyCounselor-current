import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet,
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

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel?: string;
}

export default function TeacherStudentsScreen() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user?.schoolId) return;

    const { data } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,email,grade_level')
      .eq('school_id', user.schoolId)
      .eq('role', 'student')
      .eq('approved', true)
      .order('first_name', { ascending: true });

    setStudents(
      (data ?? []).map(p => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        gradeLevel: p.grade_level ?? undefined,
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }, [user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  const query = search.trim().toLowerCase();
  const filtered = query
    ? students.filter(
        s =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          (s.gradeLevel ?? '').toLowerCase().includes(query)
      )
    : students;

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#1E73CE" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Students</Text>
        <Text style={s.headerCount}>{students.length} enrolled</Text>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, or grade…"
          placeholderTextColor="#95A2B6"
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={st => st.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.muted}>
              {query ? 'No students match your search.' : 'No approved students at your school yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const fullName = `${item.firstName} ${item.lastName}`;
          return (
            <View style={s.card}>
              <View style={[s.avatar, { backgroundColor: getAvatarBg(fullName) }]}>
                <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{fullName}</Text>
                <Text style={s.cardEmail}>{item.email}</Text>
                {item.gradeLevel && (
                  <View style={s.gradeBadge}>
                    <Text style={s.gradeText}>Grade {item.gradeLevel}</Text>
                  </View>
                )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#64728A', textAlign: 'center' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  headerCount: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#64728A' },
  // Search
  searchRow: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  searchInput: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, fontFamily: 'PublicSans_400Regular', color: '#17233D', backgroundColor: '#F4F7FB' },
  // Cards
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 },
  cardName: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', marginBottom: 2 },
  cardEmail: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginBottom: 4 },
  gradeBadge: { alignSelf: 'flex-start', backgroundColor: '#E2EEFB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  gradeText: { fontSize: 11, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
});
