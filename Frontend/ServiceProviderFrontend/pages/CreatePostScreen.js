import React, { useState, useContext } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Chip, IconButton } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import axios from 'axios';

const TONES = ["professional", "friendly", "urgent", "promotional", "trustworthy"];

export default function CreatePostScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    serviceLabel: '',
    location: 'Colombo, Sri Lanka', // Default
    contact: '+94 77 123 4567',    // Default
    tone: 'professional',
    price: '',
  });
  const [result, setResult] = useState(null);

  const C = isDark 
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', input: '#2c2c2e' } 
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', input: '#E2E8F0' };

  const handleGenerate = async () => {
    if (!form.serviceLabel) return Alert.alert("Required", "Please enter the service performed.");
    
    setLoading(true);
    try {
      // Replace with your local IP if testing on a physical device
      const response = await axios.post('http://localhost:3002/api/ad/generate-post', {
        providerName: "Kasun Perera", // Static for now
        serviceLabel: form.serviceLabel,
        location: form.location,
        contact: form.contact,
        tone: form.tone,
        price: form.price || "Contact for Quote",
        platforms: ["facebook", "instagram"]
      });

      if (response.data.success) {
        setResult(response.data.data.generatedPost);
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={[styles.header, { color: C.text }]}>Create Ad Post</Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: C.text }]}>Service Done</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.input, color: C.text }]}
          placeholder="e.g. Full House Re-piping"
          placeholderTextColor="#888"
          value={form.serviceLabel}
          onChangeText={(v) => setForm({...form, serviceLabel: v})}
        />
      </View>

      <Text style={[styles.label, { color: C.text }]}>Tone of Voice</Text>
      <View style={styles.toneRow}>
        {TONES.map(t => (
          <Chip 
            key={t} 
            selected={form.tone === t} 
            onPress={() => setForm({...form, tone: t})}
            style={styles.chip}
          >{t}</Chip>
        ))}
      </View>

      <Button 
        mode="contained" 
        onPress={handleGenerate} 
        disabled={loading}
        style={styles.btn}
      >
        {loading ? <ActivityIndicator color="#fff" /> : "✨ Generate AI Post"}
      </Button>

      {result && (
        <Card style={[styles.resultCard, { backgroundColor: C.card }]}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <Text style={{ fontWeight: 'bold', color: '#7C3AED' }}>Generated Content</Text>
              <IconButton icon="content-copy" size={20} onPress={() => Alert.alert("Copied!")} />
            </View>
            <Text style={[styles.resultText, { color: C.text }]}>{result}</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => navigation.navigate('PostFeed')}>Save to Feed</Button>
          </Card.Actions>
        </Card>
      )}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { borderRadius: 10, padding: 12, fontSize: 16 },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { marginBottom: 4 },
  btn: { paddingVertical: 6, borderRadius: 12, backgroundColor: '#7C3AED' },
  resultCard: { marginTop: 25, borderRadius: 15, elevation: 4 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultText: { fontSize: 15, lineHeight: 22 }
});