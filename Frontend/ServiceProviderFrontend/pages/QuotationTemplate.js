import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';

export default function QuotationTemplate({ route, navigation }) {
  const { task } = route.params;
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Submit Quotation</Text>
      <Text style={styles.subtitle}>For: {task.title}</Text>

      <Surface style={styles.formCard} elevation={1}>
        <TextInput
          label="Your Price (LKR)"
          value={price}
          onChangeText={setPrice}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          outlineColor="#E5E7EB"
          activeOutlineColor="#7C3AED"
        />

        <TextInput
          label="Estimated Duration (e.g. 2 Days)"
          value={duration}
          onChangeText={setDuration}
          mode="outlined"
          style={styles.input}
          outlineColor="#E5E7EB"
          activeOutlineColor="#7C3AED"
        />

        <TextInput
          label="Additional Notes / Warranty"
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          outlineColor="#E5E7EB"
          activeOutlineColor="#7C3AED"
        />

        <Button 
          mode="contained" 
          style={styles.submitBtn}
          onPress={() => alert('Quotation Sent Successfully!')}
        >
          Submit Offer
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 40 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  formCard: { padding: 20, borderRadius: 20, backgroundColor: '#FFF' },
  input: { marginBottom: 16, backgroundColor: '#FFF' },
  submitBtn: { backgroundColor: '#7C3AED', paddingVertical: 6, borderRadius: 12, marginTop: 10 }
});