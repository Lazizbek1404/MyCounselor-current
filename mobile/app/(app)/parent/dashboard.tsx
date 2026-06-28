import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
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

interface ParentProfile {
  childrenNames: string[];
  studentConfirmed: boolean;
  relationship?: string;
}

interface LinkedChild {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel?: string;
  schoolName?: string;
}

function computeUnread(messages: { sender_role: string }[]) {
  const reversed = [...messages].reverse();
  const lastParentIdx = reversed.findIndex(m => m.sender_role === 'parent');
  if (lastParentIdx === -1) return messages.filter(m => m.sender_role === 'counselor').length;
  return lastParentIdx;
}

function conversationKey(a: string, b: string) {
  return [a, b].sort().join('__');
}

export default function ParentDashboardScreen() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !user?.schoolId) return;

    // Get parent's own profile for children_names and student_confirmed
    const { data: parentData } = await supabase
      .from('profiles')
      .select('children_names,student_confirmed,relationship')
      .eq('id', user.id)
      .single();

    if (!parentData) { setLoading(false); setRefreshing(false); return; }

    const p: ParentProfile = {
      childrenNames: parentData.children_names ?? [],
      studentConfirmed: !!parentData.student_confirmed,
      relationship: parentData.relationship ?? undefined,
    };
    setProfile(p);

    // If confirmed, find matching student profiles
    if (p.studentConfirmed && p.childrenNames.length > 0) {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id,first_name,last_name,grade_level,school_name')
        .eq('school_id', user.schoolId)
        .eq('role', 'student')
        .eq('approved', true);

      const matched = (studentsData ?? []).filter(s =>
        p.childrenNames.some(name =>
          name.toLowerCase() === `${s.first_name} ${s.last_name}`.toLowerCase()
        )
      );
      setChildren(matched.map(s => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        gradeLevel: s.grade_level ?? undefined,
        schoolName: s.school_name ?? undefined,
      })));
    }

    // Unread messages count from counselors
    const { data: counselorsData } = await supabase
      .from('profiles')
      .select('id')
      .eq('school_id', user.schoolId)
      .eq('role', 'counselor')
      .eq('approved', true);

    const counselors = counselorsData ?? [];
    if (counselors.length > 0) {
      const keys = counselors.map(c => conversationKey(user.id, c.id));
      const { data: msgData } = await supabase
        .from('messages')
        .select('sender_role,conversation_key')
        .in('conversation_key', keys)
        .order('created_at', { ascending: true });

      const grouped: Record<string, { sender_role: string }[]> = {};
      keys.forEach(k => { grouped[k] = []; });
      (msgData ?? []).forEach(m => {
        if (grouped[m.conversation_key]) grouped[m.conversation_key].push(m);
      });
      setUnreadMessages(
        Object.values(grouped).reduce((sum, msgs) => sum + computeUnread(msgs), 0)
      );
    }

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

  const isPending = !profile?.studentConfirmed;
  const firstName = user?.firstName ?? '';
  const avatarBg = getAvatarBg(firstName || 'P');

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Welcome */}
        <View style={s.welcomeCard}>
          <View style={[s.welcomeAvatar, { backgroundColor: avatarBg }]}>
            <Text style={s.welcomeAvatarText}>{(firstName || 'P')[0].toUpperCase()}</Text>
          </View>
          <Text style={s.welcomeName}>Welcome, {user?.firstName}</Text>
          {profile?.relationship && (
            <Text style={s.welcomeSub}>{profile.relationship}</Text>
          )}
          <Text style={s.welcomeSchool}>{user?.schoolName}</Text>
        </View>

        {/* Pending confirmation notice */}
        {isPending && (
          <View style={s.pendingCard}>
            <Text style={s.pendingTitle}>Awaiting Student Confirmation</Text>
            <Text style={s.pendingText}>
              Your link request is pending. The student you entered must log in and confirm the connection from their dashboard.
            </Text>
            {profile && profile.childrenNames.length > 0 && (
              <View style={s.pendingNames}>
                <Text style={s.pendingLabel}>Student name(s) you entered:</Text>
                {profile.childrenNames.map((name, i) => (
                  <Text key={i} style={s.pendingName}>• {name}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Linked children */}
        {!isPending && children.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Children</Text>
            {children.map(child => {
              const fullName = `${child.firstName} ${child.lastName}`;
              return (
                <View key={child.id} style={s.childCard}>
                  <View style={[s.avatar, { backgroundColor: getAvatarBg(fullName) }]}>
                    <Text style={s.avatarText}>{child.firstName[0]}{child.lastName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.childName}>{fullName}</Text>
                    {child.gradeLevel && (
                      <Text style={s.childMeta}>Grade {child.gradeLevel}</Text>
                    )}
                    {child.schoolName && (
                      <Text style={s.childMeta}>{child.schoolName}</Text>
                    )}
                  </View>
                  <View style={s.confirmedBadge}>
                    <Text style={s.confirmedText}>Confirmed</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{children.length}</Text>
            <Text style={s.statLabel}>Linked Children</Text>
          </View>
          <View style={[s.statCard, unreadMessages > 0 && s.statCardHighlight]}>
            <Text style={[s.statValue, unreadMessages > 0 && { color: '#E5483B' }]}>
              {unreadMessages}
            </Text>
            <Text style={s.statLabel}>Unread Messages</Text>
          </View>
        </View>

        {/* Quick access info */}
        <Text style={s.sectionTitle}>Quick Access</Text>
        <View style={s.infoCard}>
          <Text style={s.infoText}>
            Use the <Text style={s.infoStrong}>Children</Text> tab to see details about your linked students.
          </Text>
        </View>
        <View style={s.infoCard}>
          <Text style={s.infoText}>
            Use the <Text style={s.infoStrong}>Messages</Text> tab to contact school counselors.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  // Welcome
  welcomeCard: { backgroundColor: '#1E73CE', borderRadius: 14, padding: 20, marginBottom: 16, alignItems: 'flex-start' },
  welcomeAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  welcomeAvatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 18 },
  welcomeName: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: '#fff', marginBottom: 4 },
  welcomeSub: { fontSize: 14, fontFamily: 'PublicSans_400Regular', color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  welcomeSchool: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: 'rgba(255,255,255,0.7)' },
  // Pending
  pendingCard: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#fcd34d' },
  pendingTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#92400e', marginBottom: 6 },
  pendingText: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#78350f', lineHeight: 19, marginBottom: 10 },
  pendingNames: { borderTopWidth: 1, borderTopColor: '#fcd34d', paddingTop: 10 },
  pendingLabel: { fontSize: 12, fontFamily: 'PublicSans_600SemiBold', color: '#92400e', marginBottom: 4 },
  pendingName: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#78350f' },
  // Children
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 10 },
  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 },
  childName: { fontSize: 14, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', marginBottom: 2 },
  childMeta: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  confirmedBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  confirmedText: { fontSize: 11, fontFamily: 'PublicSans_700Bold', color: '#15803d' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  statCardHighlight: { borderColor: '#fca5a5', backgroundColor: '#fff7f7' },
  statValue: { fontSize: 24, fontFamily: 'Manrope_800ExtraBold', color: '#1E73CE', marginBottom: 4 },
  statLabel: { fontSize: 11, fontFamily: 'PublicSans_500Medium', color: '#64728A', textAlign: 'center' },
  // Info cards
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  infoText: { fontSize: 14, fontFamily: 'PublicSans_400Regular', color: '#36425A', lineHeight: 20 },
  infoStrong: { fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
});
