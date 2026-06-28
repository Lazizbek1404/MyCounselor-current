import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
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
}

interface Request {
  id: string;
  title: string;
  student_name: string;
  category: string;
  status: string;
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  student_name: string;
  date: string;
  time: string;
  type: string;
  status: string;
}

interface Stats {
  totalStudents: number;
  pendingApprovals: number;
  pendingRequests: number;
  upcomingMeetings: number;
}

// ── Avatar helper ──────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#2C7FD6','#199FB0','#E0785A','#7C6CD6','#27A869','#E2A437','#5C6B82'];
function getAvatarBg(name: string) {
  let h = 0; for (let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:     { bg: '#FBEFD6', text: '#9A6A12', dot: '#E2A437' },
  in_progress: { bg: '#E2EEFB', text: '#1A63B8', dot: '#2C7FD6' },
  approved:    { bg: '#DCF1E6', text: '#1B8A54', dot: '#27A869' },
  confirmed:   { bg: '#DCF1E6', text: '#1B8A54', dot: '#27A869' },
  closed:      { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' },
  cancelled:   { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' };
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[s.badgeText, { color: cfg.text }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

function formatDay(v: string) {
  const d = new Date(v + 'T00:00:00');
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function CounselorDashboardScreen() {
  const { user } = useAuth();

  const [stats, setStats] = useState<Stats>({ totalStudents: 0, pendingApprovals: 0, pendingRequests: 0, upcomingMeetings: 0 });
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !user?.schoolId) return;

    const today = new Date().toISOString().split('T')[0];

    const [studentsRes, requestsRes, meetingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id,first_name,last_name,email,grade_level,approved')
        .eq('school_id', user.schoolId)
        .eq('role', 'student'),
      supabase
        .from('requests')
        .select('id,title,student_name,category,status,created_at')
        .eq('school_id', user.schoolId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('meetings')
        .select('id,title,student_name,date,time,type,status')
        .eq('counselor_id', user.id)
        .gte('date', today)
        .neq('status', 'cancelled')
        .order('date', { ascending: true })
        .limit(3),
    ]);

    const allStudents = studentsRes.data ?? [];
    const pending = allStudents.filter(s => !s.approved);

    setStats({
      totalStudents: allStudents.length,
      pendingApprovals: pending.length,
      pendingRequests: (requestsRes.data ?? []).filter(r => r.status === 'pending').length,
      upcomingMeetings: (meetingsRes.data ?? []).length,
    });

    setPendingStudents(pending.map(s => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      email: s.email,
      gradeLevel: s.grade_level ?? undefined,
    })));

    setRecentRequests((requestsRes.data ?? []) as Request[]);
    setUpcomingMeetings((meetingsRes.data ?? []) as Meeting[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id, user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  async function approveStudent(studentId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ approved: true })
      .eq('id', studentId);

    if (error) { Alert.alert('Error', error.message); return; }
    load();
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
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Header */}
        <Text style={s.greeting}>Welcome, {user?.firstName}</Text>
        <Text style={s.sub}>{user?.title ?? 'School Counselor'}</Text>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          {[
            { label: 'Total Students', value: stats.totalStudents },
            { label: 'Pending Approvals', value: stats.pendingApprovals, highlight: stats.pendingApprovals > 0 },
            { label: 'Pending Requests', value: stats.pendingRequests, highlight: stats.pendingRequests > 0 },
            { label: 'Upcoming Meetings', value: stats.upcomingMeetings },
          ].map(stat => (
            <View key={stat.label} style={[s.statCard, stat.highlight && s.statCardHighlight]}>
              <Text style={[s.statValue, stat.highlight && { color: '#E5483B' }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Pending approvals */}
        {pendingStudents.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Pending Approvals</Text>
            {pendingStudents.map(student => (
              <View key={student.id} style={s.approvalCard}>
                <View style={[s.avatar, { backgroundColor: getAvatarBg(`${student.firstName} ${student.lastName}`) }]}>
                  <Text style={s.avatarText}>{student.firstName[0]}{student.lastName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.studentName}>{student.firstName} {student.lastName}</Text>
                  <Text style={s.studentMeta}>{student.email}</Text>
                  {student.gradeLevel && <Text style={s.studentMeta}>Grade {student.gradeLevel}</Text>}
                </View>
                <TouchableOpacity
                  style={s.approveBtn}
                  onPress={() => approveStudent(student.id)}
                >
                  <Text style={s.approveBtnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Recent requests */}
        {recentRequests.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Recent Requests</Text>
            {recentRequests.map(req => (
              <View key={req.id} style={s.requestCard}>
                <View style={s.requestTop}>
                  <Text style={s.requestTitle} numberOfLines={1}>{req.title}</Text>
                  <StatusBadge status={req.status} />
                </View>
                <Text style={s.requestMeta}>{req.student_name} · {req.category}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming meetings */}
        {upcomingMeetings.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Upcoming Meetings</Text>
            {upcomingMeetings.map(m => (
              <View key={m.id} style={s.meetingCard}>
                <View style={s.meetingTop}>
                  <Text style={s.meetingTitle} numberOfLines={1}>{m.title}</Text>
                  <StatusBadge status={m.status} />
                </View>
                <Text style={s.meetingMeta}>{m.student_name} · {formatDay(m.date)} · {m.time}</Text>
              </View>
            ))}
          </View>
        )}

        {pendingStudents.length === 0 && recentRequests.length === 0 && upcomingMeetings.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.muted}>All caught up! No pending items.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 20, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 2 },
  sub: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginBottom: 16 },
  muted: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E6EBF2', alignItems: 'center',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  statCardHighlight: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  statValue: { fontSize: 26, fontFamily: 'Manrope_800ExtraBold', color: '#1E73CE', marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A', textAlign: 'center' },
  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 10 },
  // Approval card
  approvalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  studentName: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#17233D' },
  studentMeta: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  approveBtn: {
    backgroundColor: '#27A869', borderRadius: 9, paddingHorizontal: 20, height: 46,
    justifyContent: 'center', alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  // Request card
  requestCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  requestTitle: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', flex: 1 },
  requestMeta: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  // Meeting card
  meetingCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  meetingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  meetingTitle: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', flex: 1 },
  meetingMeta: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  // Status badge
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, gap: 5 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: 'PublicSans_700Bold', fontSize: 12, textTransform: 'capitalize' },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
});
