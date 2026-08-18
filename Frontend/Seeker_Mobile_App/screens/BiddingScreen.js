import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import BottomNav from '../components/BottomNav';

export default function BiddingScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');

  // Main Categories
  const mainCategories = [
    { id: 1, name: 'Repairing Services', emoji: '🔧', icon: 'build', color: '#FF6B6B' },
    { id: 2, name: 'Cleaning Services', emoji: '🧹', icon: 'cleaning-services', color: '#4ECDC4' },
    { id: 3, name: 'Gardening Services', emoji: '🌿', icon: 'grass', color: '#45B7D1' },
    { id: 4, name: 'Care & Personal', emoji: '🤝', icon: 'volunteer-activism', color: '#96CEB4' },
  ];

  // Urgency levels
  const urgencyLevels = [
    { id: 'low', label: 'Low', color: '#10B981', icon: 'flag' },
    { id: 'medium', label: 'Medium', color: '#F59E0B', icon: 'alert-triangle' },
    { id: 'high', label: 'Urgent', color: '#EF4444', icon: 'alert-circle' },
  ];

  // Service tags
  const serviceTags = {
    'Repairing Services': [
      { emoji: '💡', name: 'Electrical' },
      { emoji: '🚰', name: 'Plumbing' },
      { emoji: '🪑', name: 'Furniture' },
      { emoji: '🎨', name: 'Painting' },
    ],
    'Cleaning Services': [
      { emoji: '🏠', name: 'House Cleaning' },
      { emoji: '🏗️', name: 'Post-construction' },
      { emoji: '📦', name: 'Move in/out' },
      { emoji: '🛋️', name: 'Sofa/Carpet' },
    ],
    'Gardening Services': [
      { emoji: '🌱', name: 'Maintenance' },
      { emoji: '🏞️', name: 'Landscaping' },
      { emoji: '🌸', name: 'Planting' },
    ],
    'Care & Personal': [
      { emoji: '👶', name: 'Child Care' },
      { emoji: '👴', name: 'Elderly Care' },
      { emoji: '🐕', name: 'Pet Care' },
      { emoji: '🤝', name: 'Personal Asst' },
    ],
  };

  const quickBudgets = ['$50-100', '$100-200', '$200-300', '$300-500', '$500+'];

  const handleSubmit = () => {
    if (!selectedMainCategory) {
      Alert.alert('', 'Please select a service category');
      return;
    }
    if (!title.trim()) {
      Alert.alert('', 'What service do you need?');
      return;
    }
    if (!budget.trim()) {
      Alert.alert('', 'Please add your budget');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('✅ Bid Posted!', 'Your service request has been posted. Professionals will now bid on your job.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }, 1000);
  };

  const selectMainCategory = (category) => {
    setSelectedMainCategory(category);
    setTitle('');
  };

  const selectServiceTag = (service) => {
    setTitle(service);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create a Bid</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section */}
          <LinearGradient
            colors={['#667eea15', '#764ba215']}
            style={styles.heroSection}
          >
            <View style={styles.heroIcon}>
              <MaterialIcons name="gavel" size={40} color="#667eea" />
            </View>
            <Text style={styles.heroTitle}>Post a Job & Get Bids</Text>
            <Text style={styles.heroSubtitle}>Describe your job and let professionals bid for the best price</Text>
          </LinearGradient>

          {/* Category Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {mainCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    selectedMainCategory === cat.name && { backgroundColor: cat.color, borderWidth: 0 }
                  ]}
                  onPress={() => selectMainCategory(cat.name)}
                >
                  <MaterialIcons 
                    name={cat.icon} 
                    size={28} 
                    color={selectedMainCategory === cat.name ? '#fff' : cat.color} 
                  />
                  <Text style={[
                    styles.categoryName,
                    selectedMainCategory === cat.name && styles.categoryNameActive
                  ]}>
                    {cat.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Service Type Section */}
          {selectedMainCategory && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What service do you need?</Text>
              <View style={styles.serviceTagsGrid}>
                {serviceTags[selectedMainCategory]?.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.serviceTag,
                      title === tag.name && styles.serviceTagActive
                    ]}
                    onPress={() => selectServiceTag(tag.name)}
                  >
                    <Text style={styles.serviceTagEmoji}>{tag.emoji}</Text>
                    <Text style={[
                      styles.serviceTagText,
                      title === tag.name && styles.serviceTagTextActive
                    ]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.orContainer}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or specify manually</Text>
                <View style={styles.orLine} />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Enter your requirement..."
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          )}

          {/* Urgency Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Urgency</Text>
            <View style={styles.urgencyGrid}>
              {urgencyLevels.map((level) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.urgencyBtn,
                    selectedUrgency === level.id && { backgroundColor: level.color }
                  ]}
                  onPress={() => setSelectedUrgency(level.id)}
                >
                  <Feather 
                    name={level.icon} 
                    size={18} 
                    color={selectedUrgency === level.id ? '#fff' : level.color} 
                  />
                  <Text style={[
                    styles.urgencyText,
                    selectedUrgency === level.id && styles.urgencyTextActive
                  ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your job in detail so professionals can bid accurately..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Budget Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Budget</Text>
            <Text style={styles.sectionSubtitle}>Set your expected budget for this job</Text>
            
            <View style={styles.budgetGrid}>
              {quickBudgets.map((btn) => (
                <TouchableOpacity
                  key={btn}
                  style={[styles.budgetBtn, budget === btn && styles.budgetBtnActive]}
                  onPress={() => setBudget(btn)}
                >
                  <Text style={[styles.budgetText, budget === btn && styles.budgetTextActive]}>
                    {btn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customBudget}>
              <Text style={styles.customBudgetLabel}>Custom amount:</Text>
              <TextInput
                style={styles.customBudgetInput}
                placeholder="$ Enter amount"
                placeholderTextColor="#9CA3AF"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Location</Text>
            <Text style={styles.sectionSubtitle}>Where do you need the service?</Text>
            
            <View style={styles.locationInputContainer}>
              <Ionicons name="location-outline" size={22} color="#667eea" />
              <TextInput
                style={styles.locationInput}
                placeholder="Enter your address or area"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#667eea" />
            <Text style={styles.infoText}>
              Once posted, professionals will bid on your job. You can review bids and choose the best offer.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <Text style={styles.submitText}>Posting...</Text>
              ) : (
                <>
                  <MaterialIcons name="gavel" size={20} color="#fff" />
                  <Text style={styles.submitText}>Post Job & Get Bids</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  flex: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    margin: 16,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  categoryNameActive: {
    color: '#fff',
  },
  serviceTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  serviceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceTagActive: {
    backgroundColor: '#667eea',
    borderWidth: 0,
  },
  serviceTagEmoji: {
    fontSize: 16,
  },
  serviceTagText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  serviceTagTextActive: {
    color: '#fff',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1F2937',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  urgencyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  urgencyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  urgencyText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  urgencyTextActive: {
    color: '#fff',
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  budgetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  budgetBtnActive: {
    backgroundColor: '#667eea',
    borderWidth: 0,
  },
  budgetText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  budgetTextActive: {
    color: '#fff',
  },
  customBudget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customBudgetLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  customBudgetInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#667eea10',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#667eea',
    lineHeight: 18,
  },
  submitBtn: {
    marginHorizontal: 16,
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});