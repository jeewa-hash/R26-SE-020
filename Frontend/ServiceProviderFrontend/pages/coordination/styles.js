import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primarySoft: '#EEF2FF',

  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',

  success: '#10B981',
  successSoft: '#D1FAE5',

  warning: '#F59E0B',
  warningSoft: '#FEF3C7',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',

  info: '#3B82F6',
  infoSoft: '#DBEAFE',
};

export const getRiskStyle = (risk) => {
  if (risk === 'High') {
    return {
      bg: COLORS.dangerSoft,
      color: COLORS.danger,
      label: 'High Risk',
    };
  }

  if (risk === 'Medium') {
    return {
      bg: COLORS.warningSoft,
      color: COLORS.warning,
      label: 'Medium Risk',
    };
  }

  return {
    bg: COLORS.successSoft,
    color: COLORS.success,
    label: 'Low Risk',
  };
};

export const getStatusStyle = (status) => {
  if (status === 'confirmed') {
    return {
      bg: COLORS.infoSoft,
      color: COLORS.info,
      label: 'Confirmed',
    };
  }

  if (status === 'started') {
    return {
      bg: COLORS.primarySoft,
      color: COLORS.primary,
      label: 'Started',
    };
  }

  if (status === 'rescheduling_required') {
    return {
      bg: COLORS.dangerSoft,
      color: COLORS.danger,
      label: 'Rescheduling Required',
    };
  }

  if (status === 'rescheduled') {
    return {
      bg: COLORS.warningSoft,
      color: COLORS.warning,
      label: 'Rescheduled',
    };
  }

  if (status === 'completed') {
    return {
      bg: COLORS.successSoft,
      color: COLORS.success,
      label: 'Completed',
    };
  }

  return {
    bg: '#F3F4F6',
    color: COLORS.muted,
    label: status || 'Pending',
  };
};

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
  },

  headerSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },

  container: {
    flex: 1,
    padding: 16,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },

  mutedText: {
    fontSize: 13,
    color: COLORS.muted,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  outlineButtonText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },

  dangerButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  dangerButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  infoLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },

  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: '55%',
    textAlign: 'right',
  },
});