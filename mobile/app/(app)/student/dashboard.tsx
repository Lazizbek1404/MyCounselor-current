import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'closed';

interface CRequest {
  id: number;
  title: string;
  status: RequestStatus;
  createdAt: string;
  counselor: string;
  category: string;
}

interface Meeting {
  id: number;
  title: string;
  counselor: string;
  date: string;
  time: string;
  type: string;
  status: string;
}

interface Goal {
  id: number;
  title: string;
  progress: number;
  deadline: string;
  priority: string;
}

interface Resource {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  createdAt: string;
}

interface Counselor {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
}

interface PendingParent {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeStatus(s: string): RequestStatus {
  return (['pending', 'in_progress', 'approved', 'closed'].includes(s) ? s : 'pending') as RequestStatus;
}

function statusLabel(s: RequestStatus) {
  return s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
}

function meetingStatusColor(s: string) {
  if (s === 'confirmed') return '#27A869';
  if (s === 'cancelled') return '#E5483B';
  return '#E2A437';
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function conversationKey(a: string, b: string) {
  return [a, b].sort().join('__');
}

function computeUnread(messages: { sender_role: string }[], role: string) {
  const reversed = [...messages].reverse();
  const lastOwnIdx = reversed.findIndex(m => m.sender_role === role);
  if (lastOwnIdx === -1) return messages.filter(m => m.sender_role !== role).length;
  return lastOwnIdx;
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#2C7FD6','#199FB0','#E0785A','#7C6CD6','#27A869','#E2A437','#5C6B82'];
function getAvatarBg(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RequestStatus, { bg: string; text: string; dot: string }> = {
  pending:     { bg: '#FBEFD6', text: '#9A6A12', dot: '#E2A437' },
  in_progress: { bg: '#E2EEFB', text: '#1A63B8', dot: '#2C7FD6' },
  approved:    { bg: '#DCF1E6', text: '#1B8A54', dot: '#27A869' },
  closed:      { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' },
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StudentDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [requests, setRequests] = useState<CRequest[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [pendingParents, setPendingParents] = useState<PendingParent[]>([]);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;

    const [reqRes, meetRes, goalRes, profRes, resRes] = await Promise.all([
      supabase.from('requests').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('meetings').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('school_id', user.schoolId).in('role', ['counselor']).eq('approved', true),
      supabase.from('resources').select('id,title,description,category,type,created_at').eq('school_id', user.schoolId).eq('status', 'published').order('created_at', { ascending: false }).limit(4),
    ]);

    if (reqRes.data) {
      setRequests(reqRes.data.map(r => ({
        id: r.id,
        title: r.title,
        status: normalizeStatus(r.status),
        createdAt: fmtDate(r.created_at),
        counselor: r.counselor_name,
        category: r.category,
      })));
    }

    if (meetRes.data) {
      setMeetings(meetRes.data.map(m => ({
        id: m.id,
        title: m.title,
        counselor: m.counselor_name,
        date: m.date,
        time: m.time,
        type: m.type,
        status: m.status,
      })));
    }

    if (goalRes.data) {
      setGoals(goalRes.data.map(g => ({
        id: g.id,
        title: g.title,
        progress: g.progress,
        deadline: g.deadline,
        priority: g.priority,
      })));
    }

    const schoolCounselors: Counselor[] = (profRes.data ?? []).map(p => ({
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      title: p.title ?? undefined,
      department: p.department ?? undefined,
    }));
    setCounselors(schoolCounselors);

    if (resRes.data) {
      setResources(resRes.data.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        type: r.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        createdAt: fmtDate(r.created_at),
      })));
    }

    // Compute unread messages
    if (schoolCounselors.length > 0) {
      const keys = schoolCounselors.map(c => conversationKey(user.id, c.id));
      const { data: msgData } = await supabase
        .from('messages').select('conversation_key,sender_role')
        .in('conversation_key', keys);

      if (msgData) {
        const byKey: Record<string, typeof msgData> = {};
        keys.forEach(k => { byKey[k] = []; });
        msgData.forEach(m => { if (byKey[m.conversation_key]) byKey[m.conversation_key].push(m); });
        const total = Object.values(byKey).reduce((sum, msgs) => sum + computeUnread(msgs, 'student'), 0);
        setUnreadTotal(total);
      }
    }

    // Pending parents (only if approved)
    if (user.approved === true) {
      const studentFullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const { data: parentRows } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,relationship,children_names')
        .eq('school_id', user.schoolId)
        .eq('role', 'parent')
        .eq('student_confirmed', false);

      const pending = (parentRows ?? [])
        .filter(p => (p.children_names ?? []).some(
          (n: string) => n.toLowerCase().trim() === studentFullName
        ))
        .map(p => ({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          relationship: p.relationship ?? 'Parent',
        }));
      setPendingParents(pending);
    }
  }, [user?.id, user?.schoolId, user?.approved, user?.firstName, user?.lastName]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function confirmParent(parentId: string) {
    const { error } = await supabase.from('profiles').update({ student_confirmed: true }).eq('id', parentId);
    if (!error) setPendingParents(prev => prev.filter(p => p.id !== parentId));
  }

  async function rejectParent(parentId: string) {
    Alert.alert('Reject Request', 'This will remove the parent account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('profiles').delete().eq('id', parentId);
          if (!error) setPendingParents(prev => prev.filter(p => p.id !== parentId));
        },
      },
    ]);
  }

  async function updateGoalProgress(goalId: number, delta: number) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newProgress = Math.min(100, Math.max(0, goal.progress + delta));
    const { error } = await supabase.from('goals').update({ progress: newProgress }).eq('id', goalId).eq('student_id', user!.id);
    if (!error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progress: newProgress } : g));
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#1E73CE" />
      </SafeAreaView>
    );
  }

  // Derived stats
  const upcomingMeetings = meetings.filter(m => m.status === 'confirmed' || m.status === 'pending');
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const avgGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // ── Pending approval view ────────────────────────────────────────────────────
  if (user?.approved !== true) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Text style={s.greeting}>{greeting},</Text>
          <Text style={s.name}>{user?.firstName ?? 'Student'}</Text>

          <View style={[s.card, { borderColor: '#E2A437', borderWidth: 1.5, marginTop: 20 }]}>
            <Text style={[s.cardTitle, { color: '#9A6A12' }]}>Account Pending Approval</Text>
            <Text style={s.body}>Your account was created. A school counselor needs to approve it before you can access all features. This usually takes 1–2 school days.</Text>
            <Text style={[s.body, { color: '#E2A437', marginTop: 8 }]}>Waiting for counselor approval</Text>
          </View>

          {counselors.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>Your School Counselor(s)</Text>
              {counselors.map(c => (
                <View key={c.id} style={s.card}>
                  <Text style={s.cardTitle}>{c.firstName} {c.lastName}</Text>
                  <Text style={s.muted}>{c.title ?? 'School Counselor'}</Text>
                  {c.department && <Text style={s.muted}>{c.department} Department</Text>}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Approved view ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Text style={s.greeting}>{greeting},</Text>
        <Text style={s.name}>{user?.firstName ?? 'Student'}</Text>
        {user?.schoolName && (
          <Text style={s.muted}>{user.schoolName}{user.gradeLevel ? ` · Grade ${user.gradeLevel}` : ''}</Text>
        )}

        {/* Stats */}
        <View style={s.statsGrid}>
          <StatCard label="Upcoming Meetings" value={upcomingMeetings.length} />
          <StatCard label="Goals Progress" value={`${avgGoalProgress}%`} />
          <StatCard label="Unread Messages" value={unreadTotal} />
          <StatCard label="Pending Requests" value={pendingRequests} />
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsGrid}>
          {[
            { label: 'Requests', route: '/(app)/student/requests' },
            { label: 'Messages', route: '/(app)/student/messages' },
            { label: 'Meetings', route: '/(app)/student/meetings' },
            { label: 'Guidance', route: '/(app)/student/guidance' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={s.actionBtn} onPress={() => router.push(a.route as any)}>
              <Text style={s.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pending parent confirmations */}
        {pendingParents.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Parent Confirmation Requests</Text>
            {pendingParents.map(p => (
              <View key={p.id} style={s.card}>
                <Text style={s.cardTitle}>{p.firstName} {p.lastName}</Text>
                <Text style={s.muted}>{p.relationship} — wants to link as your parent</Text>
                <View style={s.row}>
                  <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#27A869' }]} onPress={() => confirmParent(p.id)}>
                    <Text style={s.smallBtnText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#E5483B' }]} onPress={() => rejectParent(p.id)}>
                    <Text style={s.smallBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Counselors */}
        {counselors.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Your Counselor(s)</Text>
            {counselors.map(c => {
              const avatarBg = getAvatarBg(`${c.firstName} ${c.lastName}`);
              return (
                <View key={c.id} style={s.card}>
                  <View style={s.counselorRow}>
                    <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                      <Text style={s.avatarText}>{c.firstName[0]}{c.lastName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{c.firstName} {c.lastName}</Text>
                      <Text style={s.muted}>{c.title ?? 'School Counselor'}{c.department ? ` · ${c.department}` : ''}</Text>
                    </View>
                  </View>
                  <View style={s.row}>
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#27A869' }]} onPress={() => router.push('/(app)/student/messages' as any)}>
                      <Text style={s.smallBtnText}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: '#1E73CE' }]} onPress={() => router.push('/(app)/student/meetings' as any)}>
                      <Text style={s.smallBtnText}>Book Meeting</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Recent requests */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Requests</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/student/requests' as any)}>
            <Text style={s.link}>View all</Text>
          </TouchableOpacity>
        </View>
        {requests.slice(0, 3).length > 0 ? (
          requests.slice(0, 3).map(r => {
            const badge = STATUS_BADGE[r.status];
            return (
              <View key={r.id} style={s.card}>
                <View style={s.row}>
                  <Text style={[s.cardTitle, { flex: 1 }]}>{r.title}</Text>
                  <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: badge.dot }]} />
                    <Text style={[s.statusBadgeText, { color: badge.text }]}>{statusLabel(r.status)}</Text>
                  </View>
                </View>
                <Text style={s.muted}>{r.counselor} · {r.createdAt}</Text>
                <View style={[s.chip, { marginTop: 6 }]}>
                  <Text style={s.chipText}>{r.category}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyNote text="No requests yet." />
        )}

        {/* Upcoming meetings */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Upcoming Meetings</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/student/meetings' as any)}>
            <Text style={s.link}>View all</Text>
          </TouchableOpacity>
        </View>
        {upcomingMeetings.slice(0, 2).length > 0 ? (
          upcomingMeetings.slice(0, 2).map(m => (
            <View key={m.id} style={s.card}>
              <View style={s.row}>
                <Text style={[s.cardTitle, { flex: 1 }]}>{m.title}</Text>
                <View style={[s.statusBadge, { backgroundColor: '#E2EEFB' }]}>
                  <View style={[s.statusDot, { backgroundColor: '#2C7FD6' }]} />
                  <Text style={[s.statusBadgeText, { color: '#1A63B8' }]}>{m.type === 'video' ? 'Video' : 'In-Person'}</Text>
                </View>
              </View>
              <Text style={s.muted}>{m.counselor}</Text>
              <Text style={s.muted}>{m.date} · {m.time}</Text>
            </View>
          ))
        ) : (
          <EmptyNote text="No upcoming meetings." />
        )}

        {/* Latest guidance */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Latest Guidance</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/student/guidance' as any)}>
            <Text style={s.link}>View all</Text>
          </TouchableOpacity>
        </View>
        {resources.length > 0 ? (
          resources.map(r => (
            <View key={r.id} style={s.card}>
              <Text style={[s.muted, { color: '#1E73CE', marginBottom: 2, fontFamily: 'PublicSans_600SemiBold' }]}>
                {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
              </Text>
              <Text style={s.cardTitle}>{r.title}</Text>
              <Text style={s.muted} numberOfLines={2}>{r.description}</Text>
              <Text style={[s.muted, { marginTop: 4 }]}>{r.type} · {r.createdAt}</Text>
            </View>
          ))
        ) : (
          <EmptyNote text="No published resources yet." />
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Goals Progress</Text>
            {goals.map(g => (
              <View key={g.id} style={s.card}>
                <View style={s.row}>
                  <Text style={[s.cardTitle, { flex: 1 }]}>{g.title}</Text>
                  <Text style={{ fontFamily: 'Manrope_700Bold', color: '#1E73CE' }}>{g.progress}%</Text>
                </View>
                <Text style={s.muted}>Due: {g.deadline} · Priority: {g.priority}</Text>
                {/* Progress bar */}
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${g.progress}%` as any, backgroundColor: g.progress >= 75 ? '#27A869' : g.progress >= 50 ? '#1E73CE' : g.progress >= 25 ? '#E2A437' : '#E5483B' }]} />
                </View>
                {editingGoalId === g.id ? (
                  <View style={[s.row, { marginTop: 8 }]}>
                    <TouchableOpacity style={s.nudgeBtn} onPress={() => updateGoalProgress(g.id, -10)}>
                      <Text style={s.nudgeBtnText}>−10%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.nudgeBtn} onPress={() => updateGoalProgress(g.id, 10)}>
                      <Text style={s.nudgeBtnText}>+10%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingGoalId(null)}>
                      <Text style={s.link}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setEditingGoalId(g.id)} style={{ marginTop: 6 }}>
                    <Text style={s.link}>Update Progress</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <View style={s.emptyNote}>
      <Text style={s.emptyNoteText}>{text}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  scroll: { padding: 16, paddingBottom: 40 },
  greeting: { fontSize: 14, color: '#64728A', fontFamily: 'PublicSans_400Regular' },
  name: { fontSize: 26, color: '#17233D', marginTop: 2, fontFamily: 'Manrope_800ExtraBold' },
  muted: { fontSize: 13, color: '#64728A', fontFamily: 'PublicSans_500Medium' },
  body: { fontSize: 14, color: '#36425A', lineHeight: 20, fontFamily: 'PublicSans_400Regular' },
  sectionTitle: { fontSize: 16, color: '#17233D', marginTop: 20, marginBottom: 10, fontFamily: 'Manrope_700Bold' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  link: { fontSize: 13, color: '#1E73CE', fontFamily: 'PublicSans_600SemiBold' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: { fontSize: 14, color: '#17233D', marginBottom: 4, fontFamily: 'Manrope_700Bold' },
  counselorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EBF2',
    alignItems: 'center',
    shadowColor: '#142850',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: { fontSize: 24, color: '#1E73CE', fontFamily: 'Manrope_700Bold' },
  statLabel: { fontSize: 12, color: '#64728A', marginTop: 4, textAlign: 'center', fontFamily: 'PublicSans_500Medium' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#E2EEFB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CFE0F4',
  },
  actionLabel: { fontSize: 14, color: '#1E73CE', fontFamily: 'Manrope_700Bold' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontFamily: 'PublicSans_700Bold', fontSize: 12 },
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F4F7FB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { fontSize: 11, color: '#36425A', fontFamily: 'PublicSans_500Medium' },
  smallBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  smallBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Manrope_700Bold' },
  progressBar: { height: 6, backgroundColor: '#F4F7FB', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  nudgeBtn: {
    borderWidth: 1,
    borderColor: '#E6EBF2',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  nudgeBtnText: { fontSize: 13, color: '#36425A', fontFamily: 'PublicSans_500Medium' },
  emptyNote: {
    backgroundColor: '#F4F7FB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EBF2',
    marginBottom: 10,
  },
  emptyNoteText: { fontFamily: 'PublicSans_500Medium', color: '#64728A' },
});
