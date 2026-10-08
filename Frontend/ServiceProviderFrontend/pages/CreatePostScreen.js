import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Text, Button, Card, Chip, IconButton, Switch, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { CONFIG } from '../config';

const { width } = Dimensions.get('window');

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
  const [generatedBy, setGeneratedBy] = useState(null);
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
  const [penaltyRestricted, setPenaltyRestricted] = useState(false);
  const [penaltyRatio, setPenaltyRatio] = useState('3/3');

  // Theme-based colors
  const C = isDark ? {
    bg: '#0F172A',
    card: '#1E293B',
    cardBorder: '#334155',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    input: '#1E293B',
    inputBorder: '#334155',
    primary: '#3B82F6',
    primaryLight: '#1E3A5F',
    primaryDark: '#2563EB',
    success: '#10B981',
    successLight: '#064E3B',
    warning: '#F59E0B',
    warningLight: '#78350F',
    danger: '#EF4444',
    dangerLight: '#7F1D1D',
    border: '#334155',
    white: '#FFFFFF',
    shadow: '#000000',
    gradientStart: '#1E293B',
    gradientEnd: '#0F172A',
  } : {
    bg: '#F0F4F8',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    text: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    input: '#F8FAFC',
    inputBorder: '#E2E8F0',
    primary: '#2563EB',
    primaryLight: '#DBEAFE',
    primaryDark: '#1E40AF',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    border: '#E2E8F0',
    white: '#FFFFFF',
    shadow: '#E2E8F0',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2',
  };

  useEffect(() => {
    const fetchProviderInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userId = await AsyncStorage.getItem('userId');
        
        if (userId) {
          try {
            const adminUrl = CONFIG.ADMIN_SERVICE_URL || 'http://192.168.1.38:5001';
            const statusRes = await fetch(`${adminUrl}/api/inquiries/check-bookable/${userId}`);
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const score = typeof statusData.penaltyScore === 'number' ? statusData.penaltyScore : (statusData.activeMissedBookingsCount || 0);
              if (score >= 3 || statusData.isRestricted || statusData.isBlocked) {
                setPenaltyRestricted(true);
                setPenaltyRatio(statusData.penaltyRatio || `${score}/3`);
              }
            }
          } catch (e) {
            console.log('Error checking penalty status:', e.message);
          }
        }

        const res = await fetch(`${CONFIG.AUTH_SERVICE_URL}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.provider) {
          let locationString = 'Not specified';
          if (data.provider.location) {
            if (typeof data.provider.location === 'string') {
              locationString = data.provider.location;
            } else if (typeof data.provider.location === 'object') {
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
          timeout: 45000,
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
        friendly = "Generation is taking longer than usual because the AI is busy. The backend retried several times.\n\nChoose OK to keep a template-based draft using your details, or Try Again to wait once more.";
      } else if (isNetwork) {
        friendly = "Could not reach the server. Please check your connection and confirm the Provider Service is running.";
      } else if (status && status >= 500) {
        friendly = `Server issue (${status}). The backend is set up to return a backup draft for most AI errors — try once more or contact support if this persists.`;
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
              const label = form.specificLabel || form.serviceLabel || "your service";
              const provider = providerInfo.providerName || "Our team";
              const loc = providerInfo.location || "your area";
              const contact = providerInfo.contact || "us";
              const sample = `${provider} offers ${label} services in ${loc}.\n\n` + (form.extraInfo ? `${form.extraInfo}\n\n` : '') + `Contact ${contact} to book an appointment. Free quotes available.\n\n` + `#${label.replace(/\s+/g, '')} #LocalServices #QualityWork`;
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

  const handleCopy = (text) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', 'Post content copied to clipboard.');
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({...form, tags: [...form.tags, tagInput.trim()]});
      setTagInput('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Penalty Restriction Alert Banner */}
        {penaltyRestricted && (
          <Surface style={[styles.penaltyAlertCard, { 
            backgroundColor: isDark ? C.dangerLight : '#FEF2F2',
            borderColor: C.danger,
          }]} elevation={2}>
            <View style={styles.penaltyAlertHeader}>
              <View style={[styles.penaltyIconBg, { backgroundColor: C.danger + '20' }]}>
                <MaterialIcons name="warning" size={22} color={C.danger} />
              </View>
              <Text style={[styles.penaltyAlertTitle, { color: C.danger }]}>
                Posting Restricted ({penaltyRatio})
              </Text>
            </View>
            <Text style={[styles.penaltyAlertDesc, { color: isDark ? '#FCA5A5' : '#7F1D1D' }]}>
              Your penalty score has reached <Text style={{ fontWeight: 'bold', color: C.danger }}>{penaltyRatio}</Text> due to missed or cancelled bookings. You cannot create new posts until your penalty points are reduced below 3.
              {'\n\n'}
              Please submit an inquiry for your missed bookings immediately to get approval from the Administrator and restore your account access.
            </Text>
            <TouchableOpacity
              style={[styles.penaltyAlertBtn, { backgroundColor: C.danger }]}
              onPress={() => navigation.navigate('SubmitInquiry')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="rate-review" size={16} color="#FFFFFF" />
              <Text style={styles.penaltyAlertBtnText}>Submit Inquiry for Missed Bookings</Text>
            </TouchableOpacity>
          </Surface>
        )}

        {/* Header Section */}
        <LinearGradient
          colors={isDark ? ['#1E293B', '#0F172A'] : [C.gradientStart, C.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerSection}>
            <View style={[styles.headerIconContainer, { backgroundColor: C.white + '20' }]}>
              <MaterialIcons name="auto-awesome" size={28} color={C.white} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Create Ad Post</Text>
              <Text style={styles.headerSubtitle}>Generate compelling content with AI</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Provider Info Card */}
        <Surface style={[styles.providerCard, { 
          backgroundColor: C.card,
          borderColor: C.cardBorder,
        }]} elevation={2}>
          <View style={styles.providerContent}>
            <View style={styles.providerRow}>
              <View style={[styles.avatarContainer, { backgroundColor: C.primaryLight }]}>
                <MaterialIcons name="person" size={24} color={C.primary} />
              </View>
              <View style={styles.providerInfo}>
                <Text style={[styles.providerName, { color: C.text }]}>
                  {typeof providerInfo.providerName === 'string' ? providerInfo.providerName : 'Unknown'}
                </Text>
                <View style={styles.providerDetails}>
                  <MaterialIcons name="location-on" size={14} color={C.textSecondary} />
                  <Text style={[styles.providerDetailText, { color: C.textSecondary }]}>
                    {typeof providerInfo.location === 'string' ? providerInfo.location : 'Not specified'}
                  </Text>
                </View>
              </View>
              <View style={[styles.verifiedBadge, { backgroundColor: C.successLight }]}>
                <MaterialIcons name="verified" size={16} color={C.success} />
              </View>
            </View>
          </View>
        </Surface>

        {/* Service Input Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Service Details</Text>
          
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialIcons name="home-repair-service" size={16} color={C.primary} />
              <Text style={[styles.label, { color: C.text }]}>Service Done</Text>
            </View>
            <View style={[styles.inputWrapper, { 
              backgroundColor: C.input,
              borderColor: C.inputBorder,
            }]}>
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="e.g. Full House Re-piping"
                placeholderTextColor={C.textMuted}
                value={form.serviceLabel}
                onChangeText={(v) => setForm({...form, serviceLabel: v})}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialIcons name="category" size={16} color={C.primary} />
              <Text style={[styles.label, { color: C.text }]}>Category</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setForm({...form, category: cat})}
                  style={[
                    styles.categoryChip,
                    { 
                      backgroundColor: form.category === cat ? C.primary : C.card,
                      borderColor: form.category === cat ? C.primary : C.cardBorder,
                    }
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: form.category === cat ? C.white : C.textSecondary }
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
              <Text style={[styles.label, { color: C.text }]}>Tags</Text>
            </View>
            <View style={styles.tagInputRow}>
              <View style={[styles.tagInputWrapper, { 
                backgroundColor: C.input,
                borderColor: C.inputBorder,
              }]}>
                <TextInput
                  style={[styles.input, styles.tagInput, { color: C.text }]}
                  placeholder="Add relevant tags"
                  placeholderTextColor={C.textMuted}
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
                    <Text style={[styles.tagText, { color: C.primary }]}>{tag}</Text>
                    <TouchableOpacity onPress={() => {
                      const newTags = form.tags.filter((_, i) => i !== index);
                      setForm({...form, tags: newTags});
                    }}>
                      <MaterialIcons name="close" size={16} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Tone Selection Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Tone of Voice</Text>
          <View style={styles.toneGrid}>
            {TONES.map(tone => (
              <TouchableOpacity
                key={tone.id}
                onPress={() => setForm({...form, tone: tone.id})}
                style={[
                  styles.toneCard,
                  { 
                    backgroundColor: form.tone === tone.id ? tone.color : C.card,
                    borderColor: form.tone === tone.id ? tone.color : C.cardBorder,
                  }
                ]}
                activeOpacity={0.8}
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
          <Text style={[styles.sectionTitle, { color: C.text }]}>Options</Text>
          
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialIcons name="language" size={16} color={C.primary} />
              <Text style={[styles.label, { color: C.text }]}>Language</Text>
            </View>
            <View style={styles.languageRow}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setForm({...form, language: lang})}
                  style={[
                    styles.languageChip,
                    { 
                      backgroundColor: form.language === lang ? C.primary : C.card,
                      borderColor: form.language === lang ? C.primary : C.cardBorder,
                    }
                  ]}
                >
                  <Text style={[
                    styles.languageChipText,
                    { color: form.language === lang ? C.white : C.textSecondary }
                  ]}>
                    {lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialIcons name="notes" size={16} color={C.primary} />
              <Text style={[styles.label, { color: C.text }]}>Additional Information</Text>
            </View>
            <View style={[styles.inputWrapper, { 
              backgroundColor: C.input,
              borderColor: C.inputBorder,
            }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: C.text }]}
                placeholder="Any specific details to include..."
                placeholderTextColor={C.textMuted}
                value={form.extraInfo}
                onChangeText={(v) => setForm({...form, extraInfo: v})}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={[styles.switchRow, { borderTopColor: C.cardBorder }]}>
            <View style={styles.switchLabel}>
              <MaterialIcons name="image" size={20} color={C.primary} />
              <Text style={[styles.switchText, { color: C.text }]}>Generate Image</Text>
            </View>
            <Switch
              value={form.generateImage}
              onValueChange={(v) => setForm({...form, generateImage: v})}
              trackColor={{ false: C.cardBorder, true: C.primary }}
              thumbColor={form.generateImage ? C.white : C.textMuted}
            />
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading || penaltyRestricted}
          style={[
            styles.generateButton, 
            { backgroundColor: (loading || penaltyRestricted) ? C.textMuted : C.primary }
          ]}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={C.white} size="small" />
          ) : (
            <>
              <LinearGradient
                colors={[C.gradientStart, C.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.generateGradient}
              >
                <MaterialIcons name="auto-awesome" size={20} color={C.white} />
                <Text style={styles.generateButtonText}>Generate AI Post</Text>
              </LinearGradient>
            </>
          )}
        </TouchableOpacity>

        {/* Result Card */}
        {result && (
          <Surface style={[styles.resultCard, { 
            backgroundColor: C.card,
            borderColor: C.cardBorder,
          }]} elevation={3}>
            <View style={styles.resultContent}>
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleContainer}>
                  <View style={[styles.resultIconContainer, { 
                    backgroundColor: generatedBy === 'fallback' ? C.warningLight : C.primaryLight 
                  }]}>
                    <MaterialIcons 
                      name={generatedBy === 'fallback' ? 'edit-note' : 'check-circle'} 
                      size={20} 
                      color={generatedBy === 'fallback' ? C.warning : C.primary} 
                    />
                  </View>
                  <View>
                    <Text style={[styles.resultTitle, { color: C.text }]}>
                      {generatedBy === 'fallback' ? 'Template Draft (AI was busy)' : 'AI-Generated Content'}
                    </Text>
                    <Text style={[styles.resultSubtitle, { color: C.textSecondary }]}>
                      {generatedBy === 'fallback' ? 'Based on your service details. Feel free to edit.' : 'Generated with Gemini AI'}
                    </Text>
                  </View>
                </View>
                <View style={styles.resultActions}>
                  {generatedBy === 'fallback' && (
                    <TouchableOpacity
                      style={[styles.retryChip, { backgroundColor: C.primaryLight }]}
                      onPress={handleGenerate}
                      disabled={loading}
                    >
                      <MaterialIcons name="refresh" size={14} color={C.primary} />
                      <Text style={[styles.retryChipText, { color: C.primary }]}>Re-try AI</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.copyButton, { backgroundColor: C.primaryLight }]}>
                    <MaterialIcons name="content-copy" size={18} color={C.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.resultTextContainer, { backgroundColor: C.input }]}>
                <Text style={[styles.resultText, { color: C.text }]}>{result}</Text>
              </View>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate('Profile')}
              >
                <MaterialIcons name="save" size={18} color={C.white} />
                <Text style={styles.saveButtonText}>Save to Feed</Text>
              </TouchableOpacity>
            </View>
          </Surface>
        )}
        
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  headerGradient: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
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
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFFCC',
    marginTop: 2,
  },

  // Provider Card
  providerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  providerContent: {
    padding: 16,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
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
  },
  providerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  providerDetailText: {
    fontSize: 12,
    marginLeft: 4,
  },
  verifiedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  // Inputs
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
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
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

  // Categories
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

  // Tags
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInputWrapper: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
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

  // Tones
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toneCard: {
    width: (width - 72) / 3,
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

  // Languages
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
  },

  // Generate Button
  generateButton: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Result Card
  resultCard: {
    marginHorizontal: 16,
    marginTop: 25,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultContent: {
    padding: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  },
  resultSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  resultTextContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Penalty Alert
  penaltyAlertCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 3,
  },
  penaltyAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  penaltyIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  penaltyAlertTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  penaltyAlertDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  penaltyAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  penaltyAlertBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});