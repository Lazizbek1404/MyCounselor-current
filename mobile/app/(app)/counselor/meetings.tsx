import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
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
  gradeLevel?: string;
}

interface Meeting {
  id: string;
  title: string;
  student_id: string;
  student_name: string;
  date: string;
  time: string;
  type: 'video' | 'in_person';
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM',
];

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: '#FBEFD6', text: '#9A6A12', dot: '#E2A437' },
  confirmed: { bg: '#DCF1E6', text: '#1B8A54', dot: '#27A869' },
  cancelled: { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' },
};

type FilterTab = 'Upcoming' | 'All' | 'Pending';
const FILTER_TABS: FilterTab[] = ['Upcoming', 'All', 'Pending'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' };
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[s.badgeText, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

function formatDate(v: string) {
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function CounselorMeetingsScreen() {
  const { user } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>('Upcoming');

  // New meeting form
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [date, setDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingType, setMeetingType] = useState<'video' | 'in_person'>('video');
  const [notes, setNotes] = useState('');
  const [studentPickerVisible, setStudentPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !user?.schoolId) return;

    const [meetingsRes, studentsRes] = await Promise.all([
      supabase
        .from('meetings')
        .select('*')
        .eq('counselor_id', user.id)
        .order('date', { ascending: true }),
      supabase
        .from('profiles')
        .select('id,first_name,last_name,grade_level')
        .eq('school_id', user.schoolId)
        .eq('role', 'student')
        .eq('approved', true),
    ]);

    setMeetings((meetingsRes.data ?? []) as Meeting[]);
    setStudents(
      (studentsRes.data ?? []).map(p => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        gradeLevel: p.grade_level ?? undefined,
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }, [user?.id, user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split('T')[0];

  const filtered = meetings.filter(m => {
    if (filterTab === 'Upcoming') return m.date >= today && m.status !== 'cancelled';
    if (filterTab === 'Pending') return m.status === 'pending';
    return true;
  });

  async function updateStatus(meetingId: string, status: 'confirmed' | 'cancelled') {
    const { error } = await supabase
      .from('meetings')
      .update({ status })
      .eq('id', meetingId);

    if (error) { Alert.alert('Error', error.message); return; }
    load();
  }

  function resetForm() {
    setTitle('');
    setSelectedStudentId('');
    setDate('');
    setSelectedTime('');
    setMeetingType('video');
    setNotes('');
  }

  async function submitMeeting() {
    if (!title.trim() || !selectedStudentId || !date.trim() || !selectedTime || !user?.id) {
      Alert.alert('Missing fields', 'Please fill in title, student, date, and time.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      Alert.alert('Invalid date', 'Enter date as YYYY-MM-DD (e.g. 2025-09-15).');
      return;
    }

    const student = students.find(s => s.id === selectedStudentId)!;
    setSubmitting(true);

    const { error } = await supabase.from('meetings').insert({
      title: title.trim(),
      student_id: selectedStudentId,
      student_name: `${student.firstName} ${student.lastName}`,
      counselor_id: user.id,
      counselor_name: `${user.firstName} ${user.lastName}`,
      school_id: user.schoolId,
      date: date.trim(),
      time: selectedTime,
      type: meetingType,
      notes: notes.trim() || null,
      status: 'confirmed',
    });

    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    resetForm();
    setModalVisible(false);
    load();
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator size="large" color="#1E73CE" />
      </SafeAreaView>
    );
  }

  const selectedStudent = students.find(st => st.id === selectedStudentId);

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Meetings</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => setModalVisible(true)}>
          <Text style={s.newBtnText}>+ Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.tabsRow}>
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, filterTab === tab && s.tabActive]}
            onPress={() => setFilterTab(tab)}
          >
            <Text style={[s.tabText, filterTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Meeting list */}
      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.muted}>No meetings found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={s.cardSub}>{item.student_name}</Text>
            <View style={s.cardRow}>
              <Text style={s.cardMeta}>{formatDate(item.date)} · {item.time}</Text>
              <View style={s.typeBadge}>
                <Text style={s.typeText}>{item.type === 'video' ? 'Video' : 'In-Person'}</Text>
              </View>
            </View>
            {item.notes ? <Text style={s.cardNotes} numberOfLines={2}>{item.notes}</Text> : null}

            {/* Action buttons for pending meetings */}
            {item.status === 'pending' && (
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnCancel]}
                  onPress={() => updateStatus(item.id, 'cancelled')}
                >
                  <Text style={s.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnConfirm]}
                  onPress={() => updateStatus(item.id, 'confirmed')}
                >
                  <Text style={s.actionBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'confirmed' && (
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnCancel, { marginTop: 10 }]}
                onPress={() => updateStatus(item.id, 'cancelled')}
              >
                <Text style={s.actionBtnText}>Cancel Meeting</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Schedule Meeting Modal */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Schedule a Meeting</Text>
            <TouchableOpacity onPress={() => { resetForm(); setModalVisible(false); }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Title *</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Academic progress check-in"
              placeholderTextColor="#95A2B6"
            />

            <Text style={s.label}>Student *</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setStudentPickerVisible(true)}>
              <Text style={selectedStudent ? s.pickerBtnText : s.pickerBtnPlaceholder}>
                {selectedStudent
                  ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
                  : 'Select student…'}
              </Text>
            </TouchableOpacity>

            <Text style={s.label}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="e.g. 2025-09-15"
              placeholderTextColor="#95A2B6"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={s.label}>Time *</Text>
            <View style={s.slotsGrid}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[s.slotChip, selectedTime === slot && s.slotChipSelected]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text style={[s.slotText, selectedTime === slot && s.slotTextSelected]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Type *</Text>
            <View style={s.typeRow}>
              {(['video', 'in_person'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeChip, meetingType === t && s.typeChipSelected]}
                  onPress={() => setMeetingType(t)}
                >
                  <Text style={[s.typeChipText, meetingType === t && s.typeChipTextSelected]}>
                    {t === 'video' ? 'Video' : 'In-Person'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Notes (optional)</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Agenda or any prep notes…"
              placeholderTextColor="#95A2B6"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={submitMeeting}
              disabled={submitting}
            >
              <Text style={s.submitBtnText}>{submitting ? 'Scheduling…' : 'Schedule Meeting'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Student picker sub-modal */}
      <Modal
        visible={studentPickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setStudentPickerVisible(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select Student</Text>
            <ScrollView>
              {students.map(st => (
                <TouchableOpacity
                  key={st.id}
                  style={s.sheetRow}
                  onPress={() => {
                    setSelectedStudentId(st.id);
                    setStudentPickerVisible(false);
                  }}
                >
                  <Text style={s.sheetRowText}>{st.firstName} {st.lastName}</Text>
                  {st.gradeLevel && <Text style={s.sheetRowSub}>Grade {st.gradeLevel}</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.sheetCancel} onPress={() => setStudentPickerVisible(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A' },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  newBtn: {
    backgroundColor: '#1E73CE', borderRadius: 9, paddingHorizontal: 20, height: 46,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1E73CE', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5,
  },
  newBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 },
  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#1E73CE' },
  tabText: { fontSize: 14, fontFamily: 'PublicSans_500Medium', color: '#64728A' },
  tabTextActive: { color: '#1E73CE', fontFamily: 'Manrope_700Bold' },
  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#17233D', flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11, gap: 5 },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontFamily: 'PublicSans_700Bold', fontSize: 12, textTransform: 'capitalize' },
  cardSub: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMeta: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#36425A' },
  typeBadge: { backgroundColor: '#E2EEFB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  cardNotes: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 9, height: 46, alignItems: 'center', justifyContent: 'center' },
  actionBtnConfirm: { backgroundColor: '#27A869' },
  actionBtnCancel: {
    backgroundColor: '#E5483B',
    shadowColor: '#E5483B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 5,
  },
  actionBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F4F7FB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  modalTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  cancelText: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  modalBody: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontFamily: 'PublicSans_600SemiBold', color: '#36425A', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D', backgroundColor: '#fff' },
  textArea: { height: 80 },
  pickerBtn: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  pickerBtnText: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D' },
  pickerBtnPlaceholder: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#95A2B6' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#fff' },
  slotChipSelected: { backgroundColor: '#1E73CE', borderColor: '#1E73CE' },
  slotText: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#36425A' },
  slotTextSelected: { color: '#fff', fontFamily: 'PublicSans_600SemiBold' },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { flex: 1, borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  typeChipSelected: { backgroundColor: '#1E73CE', borderColor: '#1E73CE' },
  typeChipText: { fontSize: 14, fontFamily: 'PublicSans_500Medium', color: '#36425A' },
  typeChipTextSelected: { color: '#fff', fontFamily: 'Manrope_700Bold' },
  submitBtn: {
    backgroundColor: '#1E73CE', borderRadius: 9, height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: '#1E73CE', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5,
  },
  submitBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  sheetTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 12 },
  sheetRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F4F7FB' },
  sheetRowText: { fontSize: 15, fontFamily: 'PublicSans_500Medium', color: '#17233D' },
  sheetRowSub: { fontSize: 12, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginTop: 2 },
  sheetCancel: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
});
