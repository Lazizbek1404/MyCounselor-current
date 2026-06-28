import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
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
  status: string;
  published_at?: string;
  created_at: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'College', 'Career', 'Academic', 'Wellness'];

const CATEGORY_COLORS: Record<string, string> = {
  college: '#7C6CD6',
  career:  '#E2A437',
  academic: '#2C7FD6',
  wellness: '#27A869',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPublishDate(v?: string) {
  if (!v) return '';
  return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StudentGuidanceScreen() {
  const { user } = useAuth();

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const load = useCallback(async () => {
    if (!user?.schoolId) return;

    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('school_id', user.schoolId)
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    setResources((data ?? []) as Resource[]);
    setLoading(false);
    setRefreshing(false);
  }, [user?.schoolId]);

  useEffect(() => { load(); }, [load]);

  const filtered = activeFilter === 'All'
    ? resources
    : resources.filter(r => r.category?.toLowerCase() === activeFilter.toLowerCase());

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
      </View>

      {/* Filter chips */}
      <View style={s.filtersRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[s.filterChip, activeFilter === cat && s.filterChipActive]}
            onPress={() => setActiveFilter(cat)}
          >
            <Text style={[s.filterChipText, activeFilter === cat && s.filterChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resources list */}
      <FlatList
        data={filtered}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.muted}>No resources available{activeFilter !== 'All' ? ` in ${activeFilter}` : ''} yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const catColor = CATEGORY_COLORS[item.category?.toLowerCase()] ?? '#64728A';
          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.categoryBadge, { backgroundColor: catColor + '20' }]}>
                  <Text style={[s.categoryText, { color: catColor }]}>
                    {capitalize(item.category ?? 'General')}
                  </Text>
                </View>
                {item.type ? (
                  <View style={s.typeBadge}>
                    <Text style={s.typeText}>{item.type}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.cardTitle}>{item.title}</Text>
              {item.description ? (
                <Text style={s.cardDescription} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={s.cardDate}>{formatPublishDate(item.published_at ?? item.created_at)}</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 13, color: '#64728A', textAlign: 'center', fontFamily: 'PublicSans_500Medium' },
  // Header
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  headerTitle: { fontSize: 18, color: '#17233D', fontFamily: 'Manrope_700Bold' },
  // Filters
  filtersRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E6EBF2' },
  filterChip: { borderWidth: 1, borderColor: '#E6EBF2', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#1E73CE', borderColor: '#1E73CE' },
  filterChipText: { fontSize: 13, color: '#36425A', fontFamily: 'PublicSans_500Medium' },
  filterChipTextActive: { color: '#fff', fontFamily: 'Manrope_700Bold' },
  // Cards
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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontFamily: 'PublicSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F4F7FB' },
  typeText: { fontSize: 11, color: '#64728A', fontFamily: 'PublicSans_500Medium', textTransform: 'capitalize' },
  cardTitle: { fontSize: 15, color: '#17233D', marginBottom: 4, fontFamily: 'Manrope_700Bold' },
  cardDescription: { fontSize: 13, color: '#64728A', lineHeight: 19, marginBottom: 8, fontFamily: 'PublicSans_400Regular' },
  cardDate: { fontSize: 12, color: '#95A2B6', fontFamily: 'PublicSans_500Medium' },
});
