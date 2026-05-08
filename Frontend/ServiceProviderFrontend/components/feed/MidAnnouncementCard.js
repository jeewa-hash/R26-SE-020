import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import i18n from '../../locales';
import { MID_ANNOUNCEMENT } from '../../constants/feedData';

export default function MidAnnouncementCard() {
  const isSi = i18n.language === 'si';
  const title = isSi ? MID_ANNOUNCEMENT.titleSi : MID_ANNOUNCEMENT.title;
  const message = isSi ? MID_ANNOUNCEMENT.messageSi : MID_ANNOUNCEMENT.message;
  const { color, bg, icon } = MID_ANNOUNCEMENT;

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <View style={styles.aiTagRow}>
          <View style={styles.aiDot} />
          <Text style={[styles.aiTagText, { color }]}>AI SUGGESTION</Text>
        </View>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, { color }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity style={[styles.btn, { backgroundColor: color }]}>
        <Text style={styles.btnText}>Optimize My Service</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  aiTagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  icon: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  message: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 12 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});