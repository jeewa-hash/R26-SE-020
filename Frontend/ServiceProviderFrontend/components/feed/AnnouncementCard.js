import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import i18n from '../../locales';

const { width } = Dimensions.get('window');

export default function AnnouncementCard({ item }) {
  const issi = i18n.language === 'si';
  const title = issi ? item.titleSi : item.title;
  const message = issi ? item.messageSi : item.message;

  return (
    <View style={[styles.card, { backgroundColor: item.bg, width: width - 32 }]}>
      <View style={styles.row}>
        <Text style={styles.icon}>{item.icon}</Text>
        <View style={styles.content}>
          <View style={styles.tagRow}>
            <MaterialIcons name="campaign" size={12} color={item.color} />
            <Text style={[styles.tag, { color: item.color }]}>LocalPro</Text>
          </View>
          <Text style={[styles.title, { color: item.color }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
      <TouchableOpacity style={[styles.btn, { backgroundColor: item.color }]}>
        <Text style={styles.btnText}>View More</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginRight: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  icon: { fontSize: 28, marginTop: 2 },
  content: { flex: 1 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  tag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  message: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  btn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});