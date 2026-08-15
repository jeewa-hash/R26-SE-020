import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Portal, Modal, Button, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.row}>
    <MaterialIcons name={icon} size={20} color="#7C3AED" />
    <View style={{ marginLeft: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

export default function TaskDetailsModal({ visible, onDismiss, task, onChat, onQuote }) {
  if (!task) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <Text style={styles.modalTitle}>Task Summary</Text>
        <Text style={styles.modalSubtitle}>{task.title}</Text>
        
        <View style={styles.detailBox}>
          <DetailRow icon="description" label="Requirements" value={task.body} />
          <DetailRow icon="location-on" label="Location" value="Colombo 03" />
          <DetailRow icon="event" label="Urgency" value={task.quoteDetails?.urgency || 'Normal'} />
          <DetailRow icon="straighten" label="Area Size" value={task.quoteDetails?.area || 'N/A'} />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.modalActions}>
          <Button 
            mode="outlined" 
            icon="chat" 
            onPress={onChat}
            style={styles.flexBtn}
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
  modalContainer: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 28 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  detailBox: { gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 15, fontWeight: '600', color: '#374151' },
  divider: { marginVertical: 20, backgroundColor: '#F3F4F6' },
  modalActions: { flexDirection: 'row', gap: 12 },
  flexBtn: { flex: 1, borderRadius: 14, paddingVertical: 4 },
});