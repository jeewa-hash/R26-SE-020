import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTranslatePost } from '../../hooks/useTranslatePost';
import { useAppliedJobs } from '../../context/AppliedJobsContext';
import { CATEGORY_COLORS } from '../../constants/feedData';
import { JOB_STATUS } from '../../constants/jobStatus';
import { Colors } from '../../theme';
import i18n from '../../locales';

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const { displayText, handleTranslate, loading, isTranslated, targetLang } =
    useTranslatePost(post.lang);
  const { applyToJob, isApplied, getJobStatus } = useAppliedJobs();

  const applied = isApplied(post.id);
  const statusKey = getJobStatus(post.id);
  const status = statusKey ? Object.values(JOB_STATUS).find((s) => s.key === statusKey) : null;
  const categoryColor = CATEGORY_COLORS[post.category] || Colors.primary;
  const isSi = i18n.language === 'si';

  return (
    <View style={styles.card}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Image source={{ uri: post.avatar }} style={styles.avatar} />
        <View style={styles.meta}>
          <Text style={styles.name}>{post.customer}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="location-on" size={12} color={Colors.textLight} />
            <Text style={styles.metaText}>{post.location}</Text>
            <View style={styles.dot} />
            <MaterialIcons name="access-time" size={12} color={Colors.textLight} />
            <Text style={styles.metaText}>{post.time}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          {post.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>🔴 {t('urgent')}</Text>
            </View>
          )}
          {post.aiMatch && (
            <View style={styles.aiMatchBadge}>
              <MaterialIcons name="auto-awesome" size={11} color="#FF9800" />
              <Text style={styles.aiMatchText}>{post.aiMatch}% {t('aiMatch')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Category ── */}
      <View style={[styles.categoryTag, { backgroundColor: categoryColor + '20' }]}>
        <Text style={[styles.categoryText, { color: categoryColor }]}>
          {post.category}
        </Text>
      </View>

      {/* ── Description ── */}
      <Text style={styles.description}>{displayText(post.description)}</Text>

      {/* ── Translate ── */}
      <TouchableOpacity
        style={styles.translateBtn}
        onPress={() => handleTranslate(post.description)}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator size={12} color={Colors.primary} />
          : <MaterialIcons name="translate" size={14} color={Colors.primary} />
        }
        <Text style={styles.translateText}>
          {loading
            ? t('translating')
            : isTranslated
            ? t('showOriginal')
            : `${t('translateTo')} ${targetLang === 'si' ? 'සිංහල' : 'English'}`
          }
        </Text>
      </TouchableOpacity>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.budgetBox}>
          <Text style={styles.budgetLabel}>{t('estBudget')}</Text>
          <Text style={styles.budgetValue}>{post.budget}</Text>
        </View>
        <StatItem icon="people" value={post.applied + (applied ? 1 : 0)} label={t('applied')} />
        <StatItem icon="visibility" value={post.views} label={t('views')} />
      </View>

      {/* ── Status Banner (shows after applying) ── */}
      {applied && status && (
        <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
          <MaterialIcons name={status.icon} size={18} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {isSi ? status.labelSi : status.label}
          </Text>
        </View>
      )}

      {/* ── Apply Button ── */}
      <TouchableOpacity
        style={[
          styles.applyBtn,
          applied && { backgroundColor: status?.color || '#16A34A' },
        ]}
        onPress={() => applyToJob(post)}
        disabled={applied}
        activeOpacity={applied ? 1 : 0.8}
      >
        <MaterialIcons
          name={applied ? status?.icon || 'check-circle' : 'send'}
          size={18}
          color={Colors.white}
          style={{ marginRight: 6 }}
        />
        <Text style={styles.applyBtnText}>
          {applied
            ? (isSi ? status?.labelSi : status?.label)
            : t('applyNow')
          }
        </Text>
      </TouchableOpacity>

      <Text style={styles.applyBtnSi}>
        {applied ? status?.labelSi : 'දැන් අයදුම් කරන්න'}
      </Text>

    </View>
  );
}

function StatItem({ icon, value, label }) {
  return (
    <View style={styles.statBox}>
      <MaterialIcons name={icon} size={14} color="#64748B" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 16,
    padding: 16, marginBottom: 4, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  meta: { flex: 1 },
  name: { fontSize: 15, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: Colors.textLight },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textLight, marginHorizontal: 4 },
  badges: { alignItems: 'flex-end', gap: 4 },
  urgentBadge: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  urgentText: { fontSize: 11, color: '#DC2626', fontWeight: '700' },
  aiMatchBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 3 },
  aiMatchText: { fontSize: 11, color: '#FF9800', fontWeight: '700' },
  categoryTag: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 14, color: Colors.text, lineHeight: 21, marginBottom: 6 },
  translateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  translateText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 16 },
  budgetBox: { flex: 1 },
  budgetLabel: { fontSize: 10, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.5 },
  budgetValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  statBox: { alignItems: 'center', gap: 1 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textLight },

  // Status Banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, borderRadius: 10, padding: 10, marginBottom: 10,
  },
  statusText: { fontSize: 13, fontWeight: '700' },

  // Apply Button
  applyBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    marginBottom: 4, flexDirection: 'row', justifyContent: 'center',
  },
  applyBtnText: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  applyBtnSi: { textAlign: 'center', fontSize: 12, color: Colors.textLight, marginBottom: 2 },
});