import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Portal, Modal, Button, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

const DetailRow = ({ icon, label, value, C }) => (
  <View style={styles.row}>
    <MaterialIcons name={icon} size={20} color="#7C3AED" />
    <View style={{ marginLeft: 12 }}>
      <Text style={[styles.label, { color: C.textSub }]}>{label}</Text>
      <Text style={[styles.value, { color: C.text }]}>{value}</Text>
    </View>
  </View>
);

export default function TaskDetailsModal({ visible, onDismiss, task, onChat, onQuote }) {
  const { isDark } = useContext(ThemeContext) || {};
  if (!task) return null;

  const C = isDark
    ? { modalBg: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', divider: '#2c2c2e' }
    : { modalBg: '#FFFFFF', text: '#111827', textSub: '#6B7280', border: '#E5E7EB', divider: '#F3F4F6' };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.modalContainer, { backgroundColor: C.modalBg, borderColor: C.border, borderWidth: isDark ? 1 : 0 }]}>
        <Text style={[styles.modalTitle, { color: C.text }]}>Task Summary</Text>
        <Text style={[styles.modalSubtitle, { color: C.textSub }]}>{task.title}</Text>
        
        <View style={styles.detailBox}>
          <DetailRow icon="description" label="Requirements" value={task.body} C={C} />
          <DetailRow icon="location-on" label="Location" value="Colombo 03" C={C} />
          <DetailRow icon="event" label="Urgency" value={task.quoteDetails?.urgency || 'Normal'} C={C} />
          <DetailRow icon="straighten" label="Area Size" value={task.quoteDetails?.area || 'N/A'} C={C} />
        </View>

        <Divider style={[styles.divider, { backgroundColor: C.divider }]} />

        <View style={styles.modalActions}>
          <Button 
            mode="outlined" 
            icon="chat" 
            onPress={onChat}
            style={[styles.flexBtn, { borderColor: '#7C3AED' }]}
            textColor="#7C3AED"
          >
            Chat First
          </Button>

          <Button 
            mode="contained" 
            onPress={onQuote}
            style={[styles.flexBtn, { backgroundColor: '#7C3AED' }]}
          >
            Send Quote
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { padding: 24, margin: 20, borderRadius: 28 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginBottom: 20 },
  detailBox: { gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 15, fontWeight: '600' },
  divider: { marginVertical: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  flexBtn: { flex: 1, borderRadius: 14, paddingVertical: 4 },
});