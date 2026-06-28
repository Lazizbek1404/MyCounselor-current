import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeLevel?: string;
  approved: boolean;
  createdAt: string;
}

type Filter = 'All' | 'Pending Approval' | 'Approved';

const FILTERS: Filter[] = ['All', 'Pending Approval', 'Approved'];

// ── Avatar helper ──────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#2C7FD6','#199FB0','#E0785A','#7C6CD6','#27A869','#E2A437','#5C6B82'];
function getAvatarBg(name: string) {
  let h = 0; for (let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function CounselorStudentsScreen() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('All');
  const [selected, setSelected] = useState<Student | null>(null);

  const load = useCallback(async () => {
    if (!user?.schoolId) return;

    const { data } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,email,grade_level,approved,created_at')
      .eq('school_id', user.schoolId)
      .eq('role', 'student')
      .order('first_name', { ascending: true });

    setStudents(
      (data ?? []).map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        gradeLevel: s.grade_level ?? undefined,
        approved: !!s.approved,
        createdAt: s.created_at,
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }, [user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'All'
    ? students
    : filter === 'Pending Approval'
      ? students.filter(s => !s.approved)
      : students.filter(s => s.approved);

  async function approveStudent(studentId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', studentId);

    if (error) { Alert.alert('Error', error.message); return; }
    setSelected(null);
    load();
  }

  async function rejectStudent(studentId: string) {
    Alert.alert(
      'Reject Student',
      'This will permanently remove the student account. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .delete()
              .eq('id', studentId);

            if (error) { Alert.alert('Error', error.message); return; }
            setSelected(null);
            load();
          },
        },
      ]
    );
  }

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
        <Text style={s.headerCount}>{students.length} total</Text>
      </View>

      {/* Filter chips */}
      <View style={s.filtersRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Student list */}
      <FlatList
        data={filtered}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.muted}>No students found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => setSelected(item)}>
            <View style={[s.avatar, { backgroundColor: getAvatarBg(`${item.firstName} ${item.lastName}`) }]}>
              <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.cardTop}>
                <Text style={s.cardName}>{item.firstName} {item.lastName}</Text>
                <View style={[s.badge, item.approved ? s.badgeApproved : s.badgePending]}>
                  <View style={[s.badgeDot, { backgroundColor: item.approved ? '#27A869' : '#E2A437' }]} />
                  <Text style={[s.badgeText, { color: item.approved ? '#1B8A54' : '#9A6A12' }]}>
                    {item.approved ? 'Approved' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={s.cardMeta}>{item.email}</Text>
              {item.gradeLevel && <Text style={s.cardMeta}>Grade {item.gradeLevel}</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Student detail modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Student Details</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={s.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalBody}>
              {/* Avatar */}
              <View style={[s.detailAvatar, { backgroundColor: getAvatarBg(`${selected.firstName} ${selected.lastName}`) }]}>
                <Text style={s.detailAvatarText}>
                  {selected.firstName[0]}{selected.lastName[0]}
                </Text>
              </View>

              <Text style={s.detailName}>{selected.firstName} {selected.lastName}</Text>
              <View style={[
                s.badge,
                selected.approved ? s.badgeApproved : s.badgePending,
                { alignSelf: 'center', marginBottom: 20 },
              ]}>
                <View style={[s.badgeDot, { backgroundColor: selected.approved ? '#27A869' : '#E2A437' }]} />
                <Text style={[s.badgeText, { color: selected.approved ? '#1B8A54' : '#9A6A12' }]}>
                  {selected.approved ? 'Approved' : 'Pending Approval'}
                </Text>
              </View>

              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{selected.email}</Text>
              </View>
              {selected.gradeLevel && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Grade</Text>
                  <Text style={s.infoValue}>{selected.gradeLevel}</Text>
                </View>
              )}
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Registered</Text>
                <Text style={s.infoValue}>
                  {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              {/* Approve/Reject for pending */}
              {!selected.approved && (
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnReject]}
                    onPress={() => rejectStudent(selected.id)}
                  >
                    <Text style={s.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnApprove]}
                    onPress={() => approveStudent(selected.id)}
                  >
                    <Text style={s.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', textAlign: 'center' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  headerCount: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  // Filters
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  filterChip: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#1E73CE', borderColor: '#1E73CE' },
  filterChipText: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#36425A' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Manrope_700Bold' },
  // Cards
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardName: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', flex: 1 },
  cardMeta: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  // Badges
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, gap: 5 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeApproved: { backgroundColor: '#DCF1E6' },
  badgePending: { backgroundColor: '#FBEFD6' },
  badgeText: { fontFamily: 'PublicSans_700Bold', fontSize: 12, textTransform: 'capitalize' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F4F7FB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  modalTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  closeText: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  modalBody: { padding: 24, alignItems: 'stretch' },
  detailAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  detailAvatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 24 },
  detailName: { fontSize: 20, fontFamily: 'Manrope_700Bold', color: '#17233D', textAlign: 'center', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4F7FB' },
  infoLabel: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#64728A' },
  infoValue: { fontSize: 13, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', flexShrink: 1, textAlign: 'right' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  actionBtn: { flex: 1, borderRadius: 9, height: 46, alignItems: 'center', justifyContent: 'center' },
  actionBtnApprove: {
    backgroundColor: '#27A869',
  },
  actionBtnReject: {
    backgroundColor: '#E5483B',
    shadowColor: '#E5483B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 5,
  },
  actionBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
});
