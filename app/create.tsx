import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import type { ImageItem, Person, QualityTerm } from '@/api/types';
import { AuthedImage } from '@/components/AuthedImage';
import { ImageViewer } from '@/components/ImageViewer';
import { Button, Card, Chip, Field, SectionHeader, Segmented, SliderRow, Toggle } from '@/components/ui';
import { useBuilder } from '@/state/builder';
import { colors, radius, spacing, typography } from '@/theme';

const PCOLS = 3;
const PGAP = spacing(1.5);
const PSIZE = Math.floor(
  (Dimensions.get('window').width - spacing(8) - PGAP * (PCOLS - 1)) / PCOLS,
);
const ICONS = ['sparkles', 'star', 'heart', 'sunny', 'leaf', 'camera', 'image', 'flame'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function thisMonthRange(): [number, number] {
  const now = new Date();
  return [Date.UTC(now.getFullYear(), now.getMonth(), 1) * 1000, Date.UTC(now.getFullYear(), now.getMonth() + 1, 1) * 1000];
}
function thisYearRange(): [number, number] {
  const now = new Date();
  return [Date.UTC(now.getFullYear(), 0, 1) * 1000, Date.UTC(now.getFullYear() + 1, 0, 1) * 1000];
}
function fmtDate(us: number | null): string {
  if (us == null) return '—';
  return new Date(us / 1000).toLocaleDateString();
}

export default function Create() {
  const router = useRouter();
  const qc = useQueryClient();
  const b = useBuilder();

  const terms = useQuery({ queryKey: ['terms'], queryFn: api.qualityTerms });
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const people = useQuery({ queryKey: ['people'], queryFn: api.people });

  const [advanced, setAdvanced] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<string>('sparkles');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    if (terms.data && config.data) b.init(terms.data.terms, config.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms.data, config.data]);

  const definition = useMemo(() => b.buildDefinition(), [b]);
  const defKey = useMemo(() => JSON.stringify(definition), [definition]);
  // Preview is run on demand (not a live filter): `searchKey` is the definition
  // that was last searched. `stale` means the user changed filters since then.
  const [searchKey, setSearchKey] = useState<string | null>(null);
  const stale = searchKey !== defKey;

  const preview = useQuery({
    queryKey: ['preview', searchKey],
    queryFn: () => api.preview(JSON.parse(searchKey as string)),
    enabled: !!searchKey,
    placeholderData: (prev) => prev,
  });

  const runPreview = () => {
    if (b.initialized) setSearchKey(defKey);
  };

  function pickDate(which: 'from' | 'to') {
    const current = which === 'from' ? b.from : b.to;
    DateTimePickerAndroid.open({
      value: current != null ? new Date(current / 1000) : new Date(),
      mode: 'date',
      onChange: (_e, date) => {
        if (date) b.patch({ [which]: date.getTime() * 1000, selYear: null, selMonth: null } as any);
      },
    });
  }

  const saveMut = useMutation({
    mutationFn: () => api.savedCreate({ title: title.trim(), icon, definition }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved'] });
      setSaveOpen(false);
      setTitle('');
      router.back();
    },
  });

  const positives = terms.data?.terms.filter((t: QualityTerm) => t.positive) ?? [];
  const negatives = terms.data?.terms.filter((t: QualityTerm) => !t.positive) ?? [];
  const wr = terms.data?.weightRange ?? { min: -2, max: 2, step: 0.1 };
  const items = preview.data?.items ?? [];

  const filteredPeople = useMemo(() => {
    const all: Person[] = people.data ?? [];
    const q = peopleSearch.trim().toLowerCase();
    const matched = q ? all.filter((p: Person) => p.name.toLowerCase().includes(q)) : all;
    // Keep selected people visible even if filtered out.
    const selected = all.filter((p: Person) => b.people.includes(p.name) && !matched.includes(p));
    return [...selected, ...matched].slice(0, 30);
  }, [people.data, peopleSearch, b.people]);

  const timeLabel =
    b.selYear != null && b.selMonth != null
      ? `${MONTHS_LONG[b.selMonth]} ${b.selYear}`
      : b.from != null
        ? 'Custom range'
        : 'All time';

  function openPreview(idx: number) {
    setViewerIndex(idx);
    setViewerOpen(true);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={typography.h2}>Create highlight</Text>
        <Pressable
          style={styles.closeBtn}
          hitSlop={10}
          onPress={() => setSaveOpen(true)}
          disabled={items.length === 0}
        >
          <Ionicons
            name="bookmark"
            size={20}
            color={items.length === 0 ? colors.textFaint : colors.primary2}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* PEOPLE */}
        <Card>
          <SectionHeader
            title="People"
            right={
              b.people.length >= 2 ? (
                <View style={styles.matchToggle}>
                  <Segmented
                    options={[
                      { label: 'Any', value: 'any' },
                      { label: 'All', value: 'all' },
                    ]}
                    value={b.peopleMatch}
                    onChange={(v) => b.patch({ peopleMatch: v })}
                  />
                </View>
              ) : undefined
            }
          />
          {people.data && people.data.length > 6 ? (
            <View style={{ marginBottom: spacing(3) }}>
              <Field
                placeholder="Search people"
                value={peopleSearch}
                onChangeText={setPeopleSearch}
                autoCapitalize="none"
              />
            </View>
          ) : null}
          {filteredPeople.length === 0 ? (
            <Text style={styles.hint}>
              {people.isLoading ? 'Loading people…' : 'No named people found.'}
            </Text>
          ) : (
            <View style={styles.peopleWrap}>
              {filteredPeople.map((p: Person) => {
                const active = b.people.includes(p.name);
                return (
                  <Pressable
                    key={p.name}
                    style={styles.person}
                    onPress={() => b.togglePerson(p.name)}
                  >
                    <View style={[styles.avatarRing, active && styles.avatarRingActive]}>
                      <AuthedImage path={p.coverThumbnailUrl} style={styles.avatar} />
                      {active ? (
                        <View style={styles.avatarCheck}>
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.personName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.personCount}>{p.imageCount}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {b.people.length >= 2 ? (
            <Text style={styles.matchHint}>
              {b.peopleMatch === 'all'
                ? 'Photos with everyone selected, together.'
                : 'Photos with anyone selected.'}
            </Text>
          ) : null}
        </Card>

        {/* WHEN */}
        <Card>
          <SectionHeader title="When" right={<Text style={styles.timeLabel}>{timeLabel}</Text>} />
          <View style={styles.chipWrap}>
            <Chip label="All time" active={b.from == null} onPress={() => b.clearTime()} />
            <Chip
              label="This month"
              active={false}
              onPress={() => {
                const [f, t] = thisMonthRange();
                b.patch({ from: f, to: t, selYear: null, selMonth: null });
              }}
            />
            <Chip
              label="This year"
              active={false}
              onPress={() => {
                const [f, t] = thisYearRange();
                b.patch({ from: f, to: t, selYear: null, selMonth: null });
              }}
            />
          </View>

          <View style={styles.yearRow}>
            <Pressable style={styles.yearBtn} onPress={() => setPickerYear((y) => y - 1)}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text style={styles.yearText}>{pickerYear}</Text>
            <Pressable
              style={styles.yearBtn}
              onPress={() => setPickerYear((y) => Math.min(new Date().getFullYear(), y + 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.monthGrid}>
            {MONTHS.map((m, idx) => {
              const active = b.selYear === pickerYear && b.selMonth === idx;
              return (
                <Pressable
                  key={m}
                  style={[styles.monthCell, active && styles.monthCellActive]}
                  onPress={() => b.setMonth(pickerYear, idx)}
                >
                  <Text style={[styles.monthText, active && styles.monthTextActive]}>{m}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.subLbl, { marginTop: spacing(3) }]}>Custom range</Text>
          <View style={styles.dateRow}>
            <Pressable style={styles.dateBtn} onPress={() => pickDate('from')}>
              <Ionicons name="calendar-outline" size={15} color={colors.textDim} />
              <Text style={styles.dateText}>From {fmtDate(b.from)}</Text>
            </Pressable>
            <Pressable style={styles.dateBtn} onPress={() => pickDate('to')}>
              <Ionicons name="calendar-outline" size={15} color={colors.textDim} />
              <Text style={styles.dateText}>To {fmtDate(b.to)}</Text>
            </Pressable>
          </View>
        </Card>

        {/* THEME */}
        <Card>
          <View style={styles.rowBetween}>
            <SectionHeader title="Theme" />
            <Toggle value={b.themeEnabled} onChange={(v) => b.patch({ themeEnabled: v })} />
          </View>
          {b.themeEnabled ? (
            <View style={{ gap: spacing(3) }}>
              <Field
                placeholder="e.g. mountains, lake, sunset"
                value={b.themeText}
                onChangeText={(t) => b.patch({ themeText: t })}
                autoCapitalize="none"
              />
              <SliderRow
                label="Theme strictness"
                value={b.themeThreshold}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(v) => b.patch({ themeThreshold: v })}
              />
            </View>
          ) : (
            <Text style={styles.hint}>Find photos that match a vibe or scene.</Text>
          )}
        </Card>

        {/* COUNT */}
        <Card>
          <SliderRow
            label="How many highlights"
            value={b.topN}
            min={1}
            max={50}
            step={1}
            onChange={(v) => b.patch({ topN: Math.round(v) })}
            format={(v) => String(Math.round(v))}
          />
        </Card>

        {/* ADVANCED */}
        <Card>
          <Pressable style={styles.advToggle} onPress={() => setAdvanced((a) => !a)}>
            <Text style={typography.title}>Advanced tuning</Text>
            <Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
          </Pressable>
          {advanced ? (
            <View style={{ marginTop: spacing(3) }}>
              <View style={styles.rowBetween}>
                <Text style={styles.lbl}>Quality</Text>
                <Pressable onPress={() => terms.data && b.resetWeights(terms.data.terms)}>
                  <Text style={styles.reset}>Reset</Text>
                </Pressable>
              </View>
              <Text style={styles.subLbl}>Reward</Text>
              {positives.map((t: QualityTerm) => (
                <SliderRow
                  key={t.label}
                  label={t.label}
                  value={b.qualityWeights[t.label] ?? t.defaultWeight}
                  min={wr.min}
                  max={wr.max}
                  step={wr.step}
                  onChange={(v) => b.setWeight(t.label, v)}
                />
              ))}
              <Text style={styles.subLbl}>Penalize</Text>
              {negatives.map((t: QualityTerm) => (
                <SliderRow
                  key={t.label}
                  label={t.label}
                  value={b.qualityWeights[t.label] ?? t.defaultWeight}
                  min={wr.min}
                  max={wr.max}
                  step={wr.step}
                  onChange={(v) => b.setWeight(t.label, v)}
                />
              ))}

              <Text style={[styles.lbl, { marginTop: spacing(3) }]}>Diversity</Text>
              <Segmented
                options={[
                  { label: 'Greedy distinct', value: 'greedy' },
                  { label: 'Iterative', value: 'rerank' },
                ]}
                value={b.method}
                onChange={(v) => b.patch({ method: v })}
              />
              <View style={{ marginTop: spacing(3) }}>
                <SliderRow label="Diversity strength (λ)" value={b.diversityLambda} min={0} max={2} step={0.05} onChange={(v) => b.patch({ diversityLambda: v })} />
                <SliderRow label="Min distinctness" value={b.minDistinct} min={0} max={0.3} step={0.01} onChange={(v) => b.patch({ minDistinct: v })} />
                <SliderRow label="Distinctness · Embedding" value={b.weightEmbedding} min={0} max={1} step={0.05} onChange={(v) => b.patch({ weightEmbedding: v })} />
                <SliderRow label="Distinctness · Location" value={b.weightSpace} min={0} max={1} step={0.05} onChange={(v) => b.patch({ weightSpace: v })} />
                <SliderRow label="Distinctness · Time" value={b.weightTime} min={0} max={1} step={0.05} onChange={(v) => b.patch({ weightTime: v })} />
              </View>
            </View>
          ) : null}
        </Card>

        {/* PREVIEW */}
        <View style={styles.previewHeader}>
          <View style={styles.previewTitleRow}>
            <Text style={typography.h2}>Preview</Text>
            {preview.isFetching ? (
              <ActivityIndicator color={colors.primary2} />
            ) : items.length ? (
              <Text style={styles.count}>{items.length}</Text>
            ) : null}
          </View>
          {preview.isError ? <Text style={styles.err}>Preview failed</Text> : null}
        </View>
        {searchKey && stale && !preview.isFetching ? (
          <Text style={styles.staleHint}>Filters changed — run the search again.</Text>
        ) : null}
        <View style={styles.grid}>
          {items.map((it: ImageItem, idx: number) => (
            <Pressable key={it.id} style={{ width: PSIZE }} onPress={() => openPreview(idx)}>
              <AuthedImage path={it.thumbnailUrl} style={styles.pcell} />
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{(it.rank ?? idx) + 1}</Text>
              </View>
              {(it.clusterSize ?? 1) > 1 ? (
                <View style={styles.pstack}>
                  <Ionicons name="layers" size={11} color="#fff" />
                </View>
              ) : null}
            </Pressable>
          ))}
          {!searchKey && !preview.isFetching ? (
            <Text style={styles.noResults}>Set your filters, then run the search.</Text>
          ) : null}
          {searchKey && !preview.isFetching && items.length === 0 ? (
            <Text style={styles.noResults}>No photos match these settings.</Text>
          ) : null}
        </View>

        <View style={{ height: spacing(24) }} />
      </ScrollView>

      <View style={styles.fab}>
        <Button
          label={preview.isFetching ? 'Searching…' : searchKey && !stale ? 'Refresh preview' : 'Run preview'}
          icon="search"
          onPress={runPreview}
          loading={preview.isFetching}
          disabled={!b.initialized}
        />
      </View>

      <ImageViewer
        items={items}
        index={viewerIndex}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />

      <Modal visible={saveOpen} transparent animationType="slide" onRequestClose={() => setSaveOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSaveOpen(false)} />
        <View style={styles.sheet}>
          <Text style={typography.h2}>Save highlight</Text>
          <Field placeholder="Title (e.g. Best of June)" value={title} onChangeText={setTitle} />
          <Text style={styles.lbl}>Icon</Text>
          <View style={styles.chipWrap}>
            {ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => setIcon(ic)}
                style={[styles.iconChoice, icon === ic && styles.iconChoiceActive]}
              >
                <Ionicons name={ic} size={20} color={icon === ic ? colors.text : colors.textDim} />
              </Pressable>
            ))}
          </View>
          {saveMut.isError ? <Text style={styles.err}>Could not save</Text> : null}
          <Button
            label="Save"
            icon="checkmark"
            loading={saveMut.isPending}
            disabled={!title.trim()}
            onPress={() => saveMut.mutate()}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(2),
    gap: spacing(3),
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  count: { ...typography.title, color: colors.primary2, minWidth: 32, textAlign: 'right' },
  scroll: { padding: spacing(4), gap: spacing(4) },
  hint: { ...typography.body, color: colors.textFaint },
  lbl: { ...typography.label, marginBottom: spacing(2) },
  subLbl: { ...typography.label, color: colors.textDim, marginTop: spacing(3), marginBottom: spacing(1) },
  reset: { ...typography.label, color: colors.primary2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchToggle: { width: 120 },
  matchHint: { ...typography.caption, color: colors.textDim, marginTop: spacing(3) },

  peopleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },
  person: { width: 62, alignItems: 'center', gap: 3 },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarRingActive: { borderColor: colors.primary },
  avatar: { width: '100%', height: '100%', borderRadius: 27, backgroundColor: colors.surface2 },
  avatarCheck: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  personName: { ...typography.caption, color: colors.text, fontSize: 11, maxWidth: 60 },
  personCount: { ...typography.caption, color: colors.textFaint, fontSize: 10 },

  timeLabel: { ...typography.label, color: colors.primary2 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(5), marginTop: spacing(3) },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: { ...typography.title, fontSize: 18, minWidth: 64, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(3) },
  monthCell: {
    width: (Dimensions.get('window').width - spacing(8) - spacing(2) * 5) / 6,
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  monthCellActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthText: { ...typography.caption, color: colors.textDim, fontSize: 12 },
  monthTextActive: { color: colors.text },

  advToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  staleHint: { ...typography.caption, color: colors.warning, marginTop: spacing(1) },
  dateRow: { flexDirection: 'row', gap: spacing(2), marginTop: spacing(2) },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
  },
  dateText: { ...typography.caption, fontSize: 12, color: colors.textDim },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: PGAP },
  pcell: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.surface2 },
  rankBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: colors.overlay, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  rankText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  pstack: { position: 'absolute', top: 5, right: 5, backgroundColor: colors.overlay, borderRadius: radius.pill, padding: 4 },
  noResults: { ...typography.body, color: colors.textDim, padding: spacing(6) },
  err: { ...typography.label, color: colors.warning },

  fab: { position: 'absolute', left: spacing(4), right: spacing(4), bottom: spacing(4) },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing(5), gap: spacing(3), borderTopWidth: 1, borderColor: colors.border },
  iconChoice: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconChoiceActive: { borderColor: colors.primary, backgroundColor: colors.primary },
});
