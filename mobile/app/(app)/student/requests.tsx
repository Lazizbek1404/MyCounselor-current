import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Modal, FlatList, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

type RequestStatus = 'pending' | 'in_progress' | 'approved' | 'closed';

const CATEGORIES = ['academic', 'college', 'career', 'personal', 'wellness'] as const;
type Category = typeof CATEGORIES[number];

interface CRequest {
  id: number;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
  counselor: string;
  counselorId: string | null;
  category: string;
  response?: string | null;
}

interface Counselor {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizeStatus(s: string): RequestStatus {
  return (['pending', 'in_progress', 'approved', 'closed'].includes(s) ? s : 'pending') as RequestStatus;
}

function statusLabel(s: RequestStatus) {
  return s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Status badge config ────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RequestStatus, { bg: string; text: string; dot: string }> = {
  pending:     { bg: '#FBEFD6', text: '#9A6A12', dot: '#E2A437' },
  in_progress: { bg: '#E2EEFB', text: '#1A63B8', dot: '#2C7FD6' },
  approved:    { bg: '#DCF1E6', text: '#1B8A54', dot: '#27A869' },
  closed:      { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' },
};

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StudentRequestsScreen() {
  const { user } = useAuth();

  const [requests, setRequests] = useState<CRequest[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCounselorPicker, setShowCounselorPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '' as Category | '',
    counselorId: '',
    counselorName: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [reqRes, profRes] = await Promise.all([
      supabase.from('requests').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,first_name,last_name,title').eq('school_id', user.schoolId).eq('role', 'counselor').eq('approved', true),
    ]);

    if (reqRes.data) {
      setRequests(reqRes.data.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        status: normalizeStatus(r.status),
        createdAt: fmtDate(r.created_at),
        counselor: r.counselor_name,
        counselorId: r.counselor_id,
        category: r.category,
        response: r.response,
      })));
    }

    if (profRes.data) {
      setCounselors(profRes.data.map(p => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        title: p.title ?? undefined,
      })));
    }
  }, [user?.id, user?.schoolId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function setField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  }

  function validateForm() {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.category) e.category = 'Select a category';
    if (!form.counselorId) e.counselorId = 'Select a counselor';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitRequest() {
    if (!validateForm() || !user?.id) return;
    setSubmitting(true);
    const { error } = await supabase.from('requests').insert({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      counselor_id: form.counselorId,
      counselor_name: form.counselorName,
      student_id: user.id,
      student_name: `${user.firstName} ${user.lastName}`,
      school_id: user.schoolId,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setShowModal(false);
    setForm({ title: '', description: '', category: '', counselorId: '', counselorName: '' });
    setFormErrors({});
    await load();
  }

  function openModal() {
    setForm({ title: '', description: '', category: '', counselorId: '', counselorName: '' });
    setFormErrors({});
    setShowModal(true);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.center}><ActivityIndicator size="large" color="#1E73CE" /></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Counseling Requests</Text>
        <TouchableOpacity style={s.addBtn} onPress={openModal}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {requests.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No requests yet</Text>
            <Text style={s.muted}>Tap "+ New" to create your first counseling request.</Text>
          </View>
        ) : (
          requests.map(r => {
            const badge = STATUS_BADGE[r.status];
            return (
              <View key={r.id} style={s.card}>
                <View style={s.cardRow}>
                  <Text style={[s.cardTitle, { flex: 1 }]}>{r.title}</Text>
                  <View style={[s.statusBadge, { backgroundColor: badge.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: badge.dot }]} />
                    <Text style={[s.statusBadgeText, { color: badge.text }]}>{statusLabel(r.status)}</Text>
                  </View>
                </View>
                <Text style={s.muted}>{r.counselor} · {r.createdAt}</Text>
                <View style={s.chipRow}>
                  <View style={s.chip}><Text style={s.chipText}>{r.category}</Text></View>
                </View>
                {r.description ? (
                  <Text style={[s.muted, { marginTop: 6 }]} numberOfLines={2}>{r.description}</Text>
                ) : null}
                {r.response ? (
                  <View style={s.responseBox}>
                    <Text style={s.responseLabel}>Counselor Response</Text>
                    <Text style={s.muted}>{r.response}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* New Request Modal */}
      <Modal visible={showModal} animationType="slide">
        <SafeAreaView style={s.modalContainer}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Request</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={s.label}>Title</Text>
              <TextInput
                style={[s.input, formErrors.title && s.inputError]}
                value={form.title}
                onChangeText={v => setField('title', v)}
                placeholder="Brief description of your request"
                placeholderTextColor="#95A2B6"
              />
              {formErrors.title ? <Text style={s.errorText}>{formErrors.title}</Text> : null}

              {/* Description */}
              <Text style={[s.label, { marginTop: 14 }]}>Description</Text>
              <TextInput
                style={[s.input, s.textarea, formErrors.description && s.inputError]}
                value={form.description}
                onChangeText={v => setField('description', v)}
                placeholder="Describe what you need help with..."
                placeholderTextColor="#95A2B6"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {formErrors.description ? <Text style={s.errorText}>{formErrors.description}</Text> : null}

              {/* Category */}
              <Text style={[s.label, { marginTop: 14 }]}>Category</Text>
              <View style={s.optionWrap}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[s.optionChip, form.category === cat && s.optionChipActive]}
                    onPress={() => setField('category', cat)}
                  >
                    <Text style={[s.optionChipText, form.category === cat && s.optionChipTextActive]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {formErrors.category ? <Text style={s.errorText}>{formErrors.category}</Text> : null}

              {/* Counselor */}
              <Text style={[s.label, { marginTop: 14 }]}>Counselor</Text>
              {counselors.length === 0 ? (
                <Text style={s.muted}>No counselors registered at your school yet.</Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={[s.pickerBtn, formErrors.counselorId && s.inputError]}
                    onPress={() => setShowCounselorPicker(true)}
                  >
                    <Text style={form.counselorId ? s.pickerValue : s.pickerPlaceholder}>
                      {form.counselorId
                        ? `${counselors.find(c => c.id === form.counselorId)?.firstName} ${counselors.find(c => c.id === form.counselorId)?.lastName}`
                        : 'Select a counselor'}
                    </Text>
                  </TouchableOpacity>
                  {formErrors.counselorId ? <Text style={s.errorText}>{formErrors.counselorId}</Text> : null}
                </>
              )}

              {/* Submit */}
              <TouchableOpacity
                style={[s.submitBtn, submitting && s.submitBtnDisabled]}
                onPress={submitRequest}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitBtnText}>Submit Request</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Counselor Picker Modal */}
      <Modal visible={showCounselorPicker} animationType="slide" transparent>
        <View style={s.pickerOverlay}>
          <SafeAreaView style={s.pickerSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Counselor</Text>
              <TouchableOpacity onPress={() => setShowCounselorPicker(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={counselors}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.pickerItem}
                  onPress={() => {
                    setField('counselorId', item.id);
                    setField('counselorName', `${item.firstName} ${item.lastName}`);
                    setShowCounselorPicker(false);
                  }}
                >
                  <Text style={s.pickerItemName}>{item.firstName} {item.lastName}</Text>
                  {item.title ? <Text style={s.muted}>{item.title}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  headerTitle: { fontSize: 18, color: '#17233D', fontFamily: 'Manrope_700Bold' },
  addBtn: { backgroundColor: '#1E73CE', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, color: '#36425A', marginBottom: 6, fontFamily: 'Manrope_700Bold' },
  muted: { fontSize: 13, color: '#64728A', fontFamily: 'PublicSans_500Medium' },
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
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 14, color: '#17233D', fontFamily: 'Manrope_700Bold' },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { backgroundColor: '#F4F7FB', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 11, color: '#36425A', fontFamily: 'PublicSans_500Medium' },
  responseBox: { marginTop: 8, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  responseLabel: { fontSize: 12, color: '#166534', marginBottom: 4, fontFamily: 'Manrope_700Bold' },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  modalTitle: { fontSize: 17, color: '#17233D', fontFamily: 'Manrope_700Bold' },
  cancelText: { fontSize: 15, color: '#1E73CE', fontFamily: 'PublicSans_600SemiBold' },
  modalScroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, color: '#36425A', marginBottom: 6, fontFamily: 'Manrope_700Bold' },
  input: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#17233D', backgroundColor: '#F4F7FB', fontFamily: 'PublicSans_400Regular' },
  textarea: { minHeight: 100 },
  inputError: { borderColor: '#E5483B' },
  errorText: { fontSize: 12, color: '#E5483B', marginTop: 3, fontFamily: 'PublicSans_500Medium' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#F4F7FB' },
  optionChipActive: { borderColor: '#1E73CE', backgroundColor: '#E2EEFB' },
  optionChipText: { fontSize: 13, color: '#36425A', fontFamily: 'PublicSans_500Medium' },
  optionChipTextActive: { color: '#1E73CE', fontFamily: 'PublicSans_600SemiBold' },
  pickerBtn: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#F4F7FB' },
  pickerValue: { fontSize: 15, color: '#17233D', fontFamily: 'PublicSans_400Regular' },
  pickerPlaceholder: { fontSize: 15, color: '#95A2B6', fontFamily: 'PublicSans_400Regular' },
  submitBtn: { backgroundColor: '#1E73CE', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  // Counselor picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F4F7FB' },
  pickerItemName: { fontSize: 15, color: '#17233D', fontFamily: 'PublicSans_500Medium' },
});
