import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Modal, ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  status: 'draft' | 'published';
  published_at?: string;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['College', 'Career', 'Academic', 'Wellness'];
const TYPES = ['article', 'video', 'worksheet', 'guide'];

const CATEGORY_COLORS: Record<string, string> = {
  college: '#7C6CD6',
  career: '#E2A437',
  academic: '#2C7FD6',
  wellness: '#27A869',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(v?: string) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function CounselorGuidanceScreen() {
  const { user } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('draft');
  const [submitting, setSubmitting] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Resource | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState('');
  const [editStatus, setEditStatus] = useState<'draft' | 'published'>('draft');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.schoolId) return;

    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('school_id', user.schoolId)
      .order('created_at', { ascending: false });

    setResources((data ?? []) as Resource[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  function resetCreateForm() {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('');
    setFormType('');
    setFormStatus('draft');
  }

  async function createResource() {
    if (!formTitle.trim() || !formCategory || !formType) {
      Alert.alert('Missing fields', 'Please fill in title, category, and type.');
      return;
    }
    setSubmitting(true);

    const now = new Date().toISOString();
    const { error } = await supabase.from('resources').insert({
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory.toLowerCase(),
      type: formType,
      status: formStatus,
      school_id: user!.schoolId,
      created_by: user!.id,
      published_at: formStatus === 'published' ? now : null,
    });

    setSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    resetCreateForm();
    setCreateVisible(false);
    load();
  }

  function openEdit(resource: Resource) {
    setEditTarget(resource);
    setEditTitle(resource.title);
    setEditDescription(resource.description ?? '');
    setEditCategory(capitalize(resource.category ?? ''));
    setEditType(resource.type ?? '');
    setEditStatus(resource.status);
  }

  async function saveEdit() {
    if (!editTarget || !editTitle.trim() || !editCategory || !editType) {
      Alert.alert('Missing fields', 'Please fill in title, category, and type.');
      return;
    }
    setEditSubmitting(true);

    const wasPublished = editTarget.status === 'published';
    const nowPublished = editStatus === 'published';
    const publishedAt = nowPublished && !wasPublished
      ? new Date().toISOString()
      : editTarget.published_at ?? null;

    const { error } = await supabase
      .from('resources')
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory.toLowerCase(),
        type: editType,
        status: editStatus,
        published_at: publishedAt,
      })
      .eq('id', editTarget.id);

    setEditSubmitting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setEditTarget(null);
    load();
  }

  async function togglePublish(resource: Resource) {
    const newStatus = resource.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('resources')
      .update({
        status: newStatus,
        published_at: newStatus === 'published' ? new Date().toISOString() : null,
      })
      .eq('id', resource.id);

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
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Guidance Resources</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => setCreateVisible(true)}>
          <Text style={s.newBtnText}>+ Publish</Text>
        </TouchableOpacity>
      </View>

      {/* Resource list */}
      <FlatList
        data={resources}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.muted}>No resources yet. Create your first one!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catColor = CATEGORY_COLORS[item.category?.toLowerCase()] ?? '#64728A';
          return (
            <TouchableOpacity style={s.card} onPress={() => openEdit(item)}>
              <View style={s.cardTop}>
                <View style={[s.categoryBadge, { backgroundColor: catColor + '22' }]}>
                  <Text style={[s.categoryText, { color: catColor }]}>
                    {capitalize(item.category ?? 'General')}
                  </Text>
                </View>
                <View style={[s.statusBadge, item.status === 'published' ? s.statusPublished : s.statusDraft]}>
                  <Text style={[s.statusText, item.status === 'published' ? s.statusTextPublished : s.statusTextDraft]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={s.cardTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <View style={s.cardBottom}>
                <View style={s.typeBadge}>
                  <Text style={s.typeText}>{item.type}</Text>
                </View>
                <Text style={s.cardDate}>
                  {item.status === 'published'
                    ? `Published ${formatDate(item.published_at ?? item.created_at)}`
                    : `Created ${formatDate(item.created_at)}`}
                </Text>
              </View>

              {/* Quick toggle publish */}
              <TouchableOpacity
                style={[s.toggleBtn, item.status === 'published' ? s.toggleBtnUnpublish : s.toggleBtnPublish]}
                onPress={() => togglePublish(item)}
              >
                <Text style={s.toggleBtnText}>
                  {item.status === 'published' ? 'Unpublish' : 'Publish'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* Create Resource Modal */}
      <Modal visible={createVisible} animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Resource</Text>
            <TouchableOpacity onPress={() => { resetCreateForm(); setCreateVisible(false); }}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ResourceForm
            title={formTitle} setTitle={setFormTitle}
            description={formDescription} setDescription={setFormDescription}
            category={formCategory} setCategory={setFormCategory}
            type={formType} setType={setFormType}
            status={formStatus} setStatus={setFormStatus}
            onSubmit={createResource}
            submitting={submitting}
            submitLabel="Create Resource"
          />
        </SafeAreaView>
      </Modal>

      {/* Edit Resource Modal */}
      <Modal visible={!!editTarget} animationType="slide" onRequestClose={() => setEditTarget(null)}>
        <SafeAreaView style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Edit Resource</Text>
            <TouchableOpacity onPress={() => setEditTarget(null)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ResourceForm
            title={editTitle} setTitle={setEditTitle}
            description={editDescription} setDescription={setEditDescription}
            category={editCategory} setCategory={setEditCategory}
            type={editType} setType={setEditType}
            status={editStatus} setStatus={setEditStatus}
            onSubmit={saveEdit}
            submitting={editSubmitting}
            submitLabel="Save Changes"
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Shared form component ──────────────────────────────────────────────────────

interface ResourceFormProps {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  type: string; setType: (v: string) => void;
  status: 'draft' | 'published'; setStatus: (v: 'draft' | 'published') => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}

function ResourceForm({
  title, setTitle, description, setDescription,
  category, setCategory, type, setType,
  status, setStatus, onSubmit, submitting, submitLabel,
}: ResourceFormProps) {
  return (
    <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Title *</Text>
      <TextInput
        style={s.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Resource title"
        placeholderTextColor="#95A2B6"
      />

      <Text style={s.label}>Description</Text>
      <TextInput
        style={[s.input, s.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description…"
        placeholderTextColor="#95A2B6"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <Text style={s.label}>Category *</Text>
      <View style={s.chipsRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.chip, category === cat && s.chipSelected]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[s.chipText, category === cat && s.chipTextSelected]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Type *</Text>
      <View style={s.chipsRow}>
        {TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.chip, type === t && s.chipSelected]}
            onPress={() => setType(t)}
          >
            <Text style={[s.chipText, type === t && s.chipTextSelected]}>{capitalize(t)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Status *</Text>
      <View style={s.typeRow}>
        {(['draft', 'published'] as const).map(st => (
          <TouchableOpacity
            key={st}
            style={[s.typeChip, status === st && s.typeChipSelected]}
            onPress={() => setStatus(st)}
          >
            <Text style={[s.typeChipText, status === st && s.typeChipTextSelected]}>
              {capitalize(st)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[s.submitBtn, submitting && { opacity: 0.6 }]}
        onPress={onSubmit}
        disabled={submitting}
      >
        <Text style={s.submitBtnText}>{submitting ? 'Saving…' : submitLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
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
  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E6EBF2',
    shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontFamily: 'PublicSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPublished: { backgroundColor: '#DCF1E6' },
  statusDraft: { backgroundColor: '#F4F7FB' },
  statusText: { fontSize: 11, fontFamily: 'PublicSans_700Bold', textTransform: 'capitalize' },
  statusTextPublished: { color: '#1B8A54' },
  statusTextDraft: { color: '#5C6B82' },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', lineHeight: 19, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F4F7FB' },
  typeText: { fontSize: 11, fontFamily: 'PublicSans_500Medium', color: '#64728A', textTransform: 'capitalize' },
  cardDate: { fontSize: 12, fontFamily: 'PublicSans_500Medium', color: '#95A2B6' },
  toggleBtn: { borderRadius: 9, height: 46, alignItems: 'center', justifyContent: 'center' },
  toggleBtnPublish: {
    backgroundColor: '#1E73CE',
    shadowColor: '#1E73CE', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5,
  },
  toggleBtnUnpublish: { backgroundColor: '#64728A' },
  toggleBtnText: { color: '#fff', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F4F7FB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  modalTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  cancelText: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  modalBody: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontFamily: 'PublicSans_600SemiBold', color: '#36425A', marginTop: 16, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D', backgroundColor: '#fff' },
  textArea: { height: 100 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  chipSelected: { backgroundColor: '#1E73CE', borderColor: '#1E73CE' },
  chipText: { fontSize: 13, fontFamily: 'PublicSans_500Medium', color: '#36425A' },
  chipTextSelected: { color: '#fff', fontFamily: 'Manrope_700Bold' },
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
});
