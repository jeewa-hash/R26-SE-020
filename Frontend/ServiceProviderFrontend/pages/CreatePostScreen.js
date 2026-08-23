import React, { useState, useContext, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Chip, IconButton, Switch } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { CONFIG } from '../config';

const TONES = [
  { id: 'professional', icon: 'business-center', color: '#2563EB' },
  { id: 'friendly', icon: 'sentiment-satisfied', color: '#3B82F6' },
  { id: 'urgent', icon: 'bolt', color: '#DC2626' },
  { id: 'promotional', icon: 'campaign', color: '#7C3AED' },
  { id: 'trustworthy', icon: 'verified', color: '#059669' },
];
const LANGUAGES = ["en", "si", "ta"];
const CATEGORIES = ["home service", "plumbing", "electrical", "carpentry", "cleaning"];

export default function CreatePostScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const [generatedBy, setGeneratedBy] = useState(null); // 'gemini' | 'fallback' | null
  const [providerInfo, setProviderInfo] = useState({
    providerId: '',
    providerName: '',
    location: '',
    contact: '',
  });
  const [form, setForm] = useState({
    serviceLabel: '',
    specificLabel: '',
    category: 'home service',
    tags: [],
    tone: 'professional',
    language: 'en',
    extraInfo: '',
    generateImage: false,
  });
  const [result, setResult] = useState(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const fetchProviderInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userId = await AsyncStorage.getItem('userId');
        
        const res = await fetch(`${CONFIG.AUTH_SERVICE_URL}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.provider) {
          // Handle location properly - check if it's an object or string
          let locationString = 'Not specified';
          if (data.provider.location) {
            if (typeof data.provider.location === 'string') {
              locationString = data.provider.location;
            } else if (typeof data.provider.location === 'object') {
              // Handle location object with latitude/longitude
              if (data.provider.location.address) {
                locationString = data.provider.location.address;
              } else if (data.provider.location.city || data.provider.location.district) {
                const parts = [
                  data.provider.location.city,
                  data.provider.location.district,
                  data.provider.location.province
                ].filter(Boolean);
                locationString = parts.join(', ') || 'Not specified';
              } else {
                locationString = 'Not specified';
              }
            }
          }
          
          setProviderInfo({
            providerId: userId || '',
            providerName: data.provider.name || 'Unknown',
            location: locationString,
            contact: data.provider.telephone || data.provider.phone || 'Not specified',
          });
        }
      } catch (err) {
        console.log('Error fetching provider info:', err);
      }
    };
    fetchProviderInfo();
  }, []);

  // White and Blue theme
  const C = {
    bg: '#F0F4F8',
    card: '#FFFFFF',
    text: '#1E293B',
    subText: '#64748B',
    input: '#F8FAFC',
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    primaryDark: '#1E40AF',
    border: '#E2E8F0',
    accent: '#3B82F6',
    success: '#10B981',
    white: '#FFFFFF',
  };

  const handleGenerate = async () => {
    if (!form.serviceLabel) return Alert.alert("Required", "Please enter the service performed.");
    
    setLoading(true);
    setGeneratedBy(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const providerId = await AsyncStorage.getItem('userId');

      if (!providerId) {
        throw new Error('Provider session is missing. Please sign in again.');
      }

      const response = await axios.post(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/generate`,
        {
          providerId,
          providerName: providerInfo.providerName,
          serviceLabel: form.serviceLabel,
          specificLabel: form.specificLabel,
          location: providerInfo.location,
          contact: providerInfo.contact,
          tone: form.tone,
          language: form.language,
          category: form.category,
          tags: form.tags,
          extraInfo: form.extraInfo,
          generateImage: form.generateImage,
          platforms: ["facebook", "instagram"],
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeout: 45000, // generous because backend may retry Gemini several times
        }
      );

      if (response.data.success) {
        const generatedPosts = response.data.data?.posts || [];
        const source = response.data.generatedBy || 'gemini';
        setGeneratedBy(source);

        const captions = generatedPosts
          .map((post) => {
            if (typeof post === 'string') return post;
            if (post && typeof post.caption === 'string') return post.caption;
            if (post && typeof post.content === 'string') return post.content;
            return '';
          })
          .filter(Boolean);

        setResult(captions.join('\n\n'));

        if (source === 'fallback') {
          Alert.alert(
            "AI temporarily busy",
            "Gemini is experiencing high demand right now. We created a solid template draft for you based on your details. You can edit it freely, or tap Try Again in a few minutes to let AI rewrite it.",
            [
              { text: "OK", style: "default" },
              {
                text: "Try Again",
                style: "default",
                onPress: () => handleGenerate(),
              },
            ]
          );
        }
      } else {
        throw new Error(response.data?.error || 'Generation failed');
      }
    } catch (err) {
      const status = err.response?.status;
      const rawServer = err.response?.data?.error;
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
      const isNetwork = !err.response && (err.message?.includes('Network') || !rawServer);
      let friendly;
      if (isTimeout) {
        friendly =
          "Generation is taking longer than usual because the AI is busy. The backend retried several times.\n\nChoose OK to keep a template-based draft using your details, or Try Again to wait once more.";
      } else if (isNetwork) {
        friendly =
          "Could not reach the server. Please check your connection and confirm the Provider Service is running.";
      } else if (status && status >= 500) {
        friendly =
          `Server issue (${status}). The backend is set up to return a backup draft for most AI errors — try once more or contact support if this persists.`;
      } else if (err.response?.data?.errors) {
        friendly = err.response.data.errors.join('\n');
      } else {
        friendly = rawServer || err.message || "Something went wrong.";
      }

      Alert.alert(
        isTimeout || isNetwork ? "Please try again" : "Could not generate post",
        friendly,
        [
          {
            text: "Use Template Draft",
            style: "default",
            onPress: () => {
              // Build a quick client-side draft so the user isn't blocked
              const label = form.specificLabel || form.serviceLabel || "your service";
              const provider = providerInfo.providerName || "Our team";
              const loc = providerInfo.location || "your area";
              const contact = providerInfo.contact || "us";
              const sample =
                `${provider} offers ${label} services in ${loc}.\n\n` +
                (form.extraInfo ? `${form.extraInfo}\n\n` : '') +
                `Contact ${contact} to book an appointment. Free quotes available.\n\n` +
                `#${label.replace(/\s+/g, '')} #LocalServices #QualityWork`;
              setResult(sample);
              setGeneratedBy('fallback');
            },
          },
          {
            text: "Try Again",
            style: "default",
            onPress: () => handleGenerate(),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({...form, tags: [...form.tags, tagInput.trim()]});
      setTagInput('');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.bg }]} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerIconContainer}>
          <MaterialIcons name="auto-awesome" size={28} color={C.white} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Create Ad Post</Text>
          <Text style={styles.headerSubtitle}>Generate compelling content with AI</Text>
        </View>
      </View>

      {/* Provider Info Card */}
      <Card style={[styles.providerCard, { backgroundColor: C.card }]}>
        <Card.Content>
          <View style={styles.providerRow}>
            <View style={styles.avatarContainer}>
              <MaterialIcons name="person" size={24} color={C.primary} />
            </View>
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>
                {typeof providerInfo.providerName === 'string' ? providerInfo.providerName : 'Unknown'}
              </Text>
              <View style={styles.providerDetails}>
                <MaterialIcons name="location-on" size={14} color={C.subText} />
                <Text style={styles.providerDetailText}>
                  {typeof providerInfo.location === 'string' ? providerInfo.location : 'Not specified'}
                </Text>
              </View>
            </View>
            <MaterialIcons name="verified" size={20} color={C.success} />
          </View>
        </Card.Content>
      </Card>

      {/* Service Input Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Details</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <MaterialIcons name="home-repair-service" size={16} color={C.primary} />
            <Text style={styles.label}>Service Done</Text>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: C.input }]}>
            <TextInput
              style={[styles.input, { color: C.text }]}
              placeholder="e.g. Full House Re-piping"
              placeholderTextColor={C.subText}
              value={form.serviceLabel}
              onChangeText={(v) => setForm({...form, serviceLabel: v})}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <MaterialIcons name="category" size={16} color={C.primary} />
            <Text style={styles.label}>Category</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setForm({...form, category: cat})}
                style={[
                  styles.categoryChip,
                  { 
                    backgroundColor: form.category === cat ? C.primary : C.white,
                    borderColor: form.category === cat ? C.primary : C.border,
                  }
                ]}
              >
                <Text style={[
                  styles.categoryChipText,
                  { color: form.category === cat ? C.white : C.subText }
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <MaterialIcons name="tag" size={16} color={C.primary} />
            <Text style={styles.label}>Tags</Text>
          </View>
          <View style={styles.tagInputRow}>
            <View style={[styles.tagInputWrapper, { backgroundColor: C.input }]}>
              <TextInput
                style={[styles.input, styles.tagInput, { color: C.text }]}
                placeholder="Add relevant tags"
                placeholderTextColor={C.subText}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={addTag}
              />
            </View>
            <TouchableOpacity style={[styles.addTagButton, { backgroundColor: C.primary }]} onPress={addTag}>
              <MaterialIcons name="add" size={24} color={C.white} />
            </TouchableOpacity>
          </View>
          {form.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {form.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.tagText, { color: C.primaryDark }]}>{tag}</Text>
                  <TouchableOpacity onPress={() => {
                    const newTags = form.tags.filter((_, i) => i !== index);
                    setForm({...form, tags: newTags});
                  }}>
                    <MaterialIcons name="close" size={16} color={C.primaryDark} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Tone Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tone of Voice</Text>
        <View style={styles.toneGrid}>
          {TONES.map(tone => (
            <TouchableOpacity
              key={tone.id}
              onPress={() => setForm({...form, tone: tone.id})}
              style={[
                styles.toneCard,
                { 
                  backgroundColor: form.tone === tone.id ? tone.color : C.white,
                  borderColor: form.tone === tone.id ? tone.color : C.border,
                }
              ]}
            >
              <MaterialIcons 
                name={tone.icon} 
                size={24} 
                color={form.tone === tone.id ? C.white : tone.color} 
              />
              <Text style={[
                styles.toneText,
                { color: form.tone === tone.id ? C.white : C.text }
              ]}>
                {tone.id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Additional Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Options</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <MaterialIcons name="language" size={16} color={C.primary} />
            <Text style={styles.label}>Language</Text>
          </View>
          <View style={styles.languageRow}>
            {LANGUAGES.map(lang => (
              <Chip
                key={lang}
                selected={form.language === lang}
                onPress={() => setForm({...form, language: lang})}
                style={[
                  styles.languageChip,
                  { 
                    backgroundColor: form.language === lang ? C.primary : C.white,
                    borderColor: form.language === lang ? C.primary : C.border,
                  }
                ]}
                textStyle={{ 
                  color: form.language === lang ? C.white : C.subText,
                  fontWeight: '600',
                }}
              >
                {lang.toUpperCase()}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <MaterialIcons name="notes" size={16} color={C.primary} />
            <Text style={styles.label}>Additional Information</Text>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: C.input }]}>
            <TextInput
              style={[styles.input, styles.textArea, { color: C.text }]}
              placeholder="Any specific details to include..."
              placeholderTextColor={C.subText}
              value={form.extraInfo}
              onChangeText={(v) => setForm({...form, extraInfo: v})}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <MaterialIcons name="image" size={20} color={C.primary} />
            <Text style={styles.switchText}>Generate Image</Text>
          </View>
          <Switch
            value={form.generateImage}
            onValueChange={(v) => setForm({...form, generateImage: v})}
            color={C.primary}
          />
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        onPress={handleGenerate}
        disabled={loading}
        style={[styles.generateButton, { backgroundColor: C.primary }]}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={C.white} size="small" />
        ) : (
          <>
            <MaterialIcons name="auto-awesome" size={20} color={C.white} />
            <Text style={styles.generateButtonText}>Generate AI Post</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Result Card */}
      {result && (
        <Card style={[styles.resultCard, { backgroundColor: C.card }]}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleContainer}>
                <View
                  style={[
                    styles.resultIconContainer,
                    {
                      backgroundColor:
                        generatedBy === 'fallback' ? '#FEF3C7' : C.primaryLight,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={generatedBy === 'fallback' ? 'edit-note' : 'check-circle'}
                    size={20}
                    color={generatedBy === 'fallback' ? '#D97706' : C.primary}
                  />
                </View>
                <View>
                  <Text style={styles.resultTitle}>
                    {generatedBy === 'fallback'
                      ? 'Template Draft (AI was busy)'
                      : 'AI-Generated Content'}
                  </Text>
                  <Text style={[styles.resultSubtitle, { color: C.subText }]}>
                    {generatedBy === 'fallback'
                      ? 'Based on your service details. Feel free to edit.'
                      : 'Generated with Gemini AI'}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {generatedBy === 'fallback' && (
                  <TouchableOpacity
                    style={[styles.retryChip, { backgroundColor: C.primaryLight }]}
                    onPress={handleGenerate}
                    disabled={loading}
                  >
                    <MaterialIcons name="refresh" size={14} color={C.primary} />
                    <Text style={[styles.retryChipText, { color: C.primary }]}>
                      Re-try AI
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.copyButton, { backgroundColor: C.primaryLight }]}>
                  <MaterialIcons name="content-copy" size={18} color={C.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.resultText, { color: C.text }]}>{result}</Text>
          </Card.Content>
          <Card.Actions style={styles.resultActions}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: C.primary }]}
              onPress={() => navigation.navigate('PostFeed')}
            >
              <MaterialIcons name="save" size={18} color={C.white} />
              <Text style={styles.saveButtonText}>Save to Feed</Text>
            </TouchableOpacity>
          </Card.Actions>
        </Card>
      )}
      
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  providerCard: {
    marginHorizontal: 20,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 10,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  providerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  providerDetailText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInputWrapper: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tagInput: {
    paddingVertical: 10,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 6,
  },
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toneCard: {
    width: '31%',
    aspectRatio: 1.2,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  toneText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'capitalize',
  },
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    borderWidth: 1,
    borderRadius: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
    marginLeft: 8,
  },
  generateButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCard: {
    marginHorizontal: 20,
    marginTop: 25,
    borderRadius: 15,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  resultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  resultSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  retryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  retryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  copyButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
  },
  resultActions: {
    padding: 15,
    paddingTop: 0,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});