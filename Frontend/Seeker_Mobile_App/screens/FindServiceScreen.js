import React, { useContext, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
import { useTheme } from '../hooks/useTheme';
import { LanguageContext } from '../context/LanguageContext';
import { startServiceSearch } from '../utils/serviceSearchApi';

export default function FindServiceScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { language } = useContext(LanguageContext) || {};
  const isSi = language === 'si';
  const [description, setDescription] = useState(route.params?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const C = { bg: isDarkMode ? '#1A1A2E' : '#F8F9FA', card: isDarkMode ? '#252642' : '#FFF', text: isDarkMode ? '#F1F5F9' : '#111827', muted: isDarkMode ? '#B8C1D9' : '#64748B', border: isDarkMode ? '#34304E' : '#DDE1EA' };
  const submit = async () => {
    if (loading || !description.trim()) return;
    setLoading(true); setError(null);
    try {
      const backendResponse = await startServiceSearch(description, language);
      navigation.navigate('FollowUpScreen', { initialMessage: description.trim(), backendResponse, source: 'text' });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
    <PageHeader title={isSi ? 'සේවාවක් සොයන්න' : 'Find a Service'} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: C.text }]}>{isSi ? 'ඔබට අවශ්‍ය උදව් කුමක්ද?' : 'What do you need help with?'}</Text>
      <Text style={[styles.help, { color: C.muted }]}>{isSi ? 'ඔබේ අවශ්‍යතාව විස්තර කරන්න. අපි අදාළ සේවා සපයන්නන් සොයා ගැනීමට උදව් කරන්නෙමු.' : 'Describe the job. We’ll ask a few questions, find matching providers and help you request quotations.'}</Text>
      <TextInput accessibilityLabel="Describe your service" multiline value={description} editable={!loading} onChangeText={setDescription} placeholder={isSi ? 'ඔබේ සේවා අවශ්‍යතාව...' : 'For example: My kitchen tap is leaking and needs repair.'} placeholderTextColor={C.muted} style={[styles.input, { backgroundColor: C.card, color: C.text, borderColor: C.border }]} />
      <Text style={[styles.help, { color: C.muted }]}>{isSi ? 'උදාහරණ' : 'Need an idea? Try one of these:'}</Text>
      {[
        ['I need help repairing a leaking tap.', 'කාන්දු වන ජල කරාමයක් අලුත්වැඩියා කිරීමට උදව් අවශ්‍යයි.'],
        ['I need my house cleaned.', 'මගේ නිවස පිරිසිදු කර ගැනීමට අවශ්‍යයි.'],
        ['I need help maintaining my garden.', 'මගේ ගෙවත්ත නඩත්තු කිරීමට උදව් අවශ්‍යයි.'],
      ].map(([en, si]) => <TouchableOpacity key={en} disabled={loading} style={[styles.example, { borderColor: C.border, backgroundColor: C.card }]} onPress={() => setDescription(isSi ? si : en)} accessibilityRole="button"><Text style={{ color: C.text, flex: 1 }}>{isSi ? si : en}</Text><Ionicons name="arrow-up-outline" size={18} color={C.muted} /></TouchableOpacity>)}
      {error && <Text accessibilityRole="alert" style={[styles.help, { color: isDarkMode ? '#FDA4AF' : '#B91C1C' }]}>{error}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={loading || !description.trim()} onPress={submit} style={[styles.submit, (!description.trim() || loading) && { opacity: 0.6 }]}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>{isSi ? 'ඉදිරියට' : 'Find Matching Services'}</Text>}</TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={styles.alternative} onPress={() => navigation.navigate('CreatePostScreen')}><Text style={{ color: isDarkMode ? '#A5B4FC' : '#4F46E5', textAlign: 'center' }}>{isSi ? 'ඒ වෙනුවට වැඩක් පළ කරන්න' : 'Prefer to receive offers? Post a job instead'}</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 14, paddingBottom: 36 }, title: { fontSize: 24, lineHeight: 32, fontWeight: '700' }, help: { fontSize: 14, lineHeight: 21 }, input: { minHeight: 125, borderWidth: 1, borderRadius: 16, padding: 16, textAlignVertical: 'top', fontSize: 16 }, example: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: 12, minHeight: 48 }, submit: { backgroundColor: '#4F46E5', minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, submitText: { color: '#FFF', fontWeight: '700', fontSize: 15 }, alternative: { paddingVertical: 12 } });
