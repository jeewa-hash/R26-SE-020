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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

export default function BiddingScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState('');

  // Main Categories
  const mainCategories = [
    { id: 1, name: 'Repairing Services', emoji: '🔧', color: '#FF6B6B' },
    { id: 2, name: 'Cleaning Services', emoji: '🧹', color: '#4ECDC4' },
    { id: 3, name: 'Gardening Services', emoji: '🌿', color: '#45B7D1' },
    { id: 4, name: 'Care & Personal Support', emoji: '🤝', color: '#96CEB4' },
  ];

  // Service tags - SHORTENED and SMALLER
  const serviceTags = {
    'Repairing Services': [
      { emoji: '💡', name: 'Electrical' },
      { emoji: '🚰', name: 'Plumbing' },
      { emoji: '🪑', name: 'Furniture' },
      { emoji: '🎨', name: 'Painting' },
    ],
    'Cleaning Services': [
      { emoji: '🏠', name: 'House' },
      { emoji: '🏗️', name: 'Post-const.' },
      { emoji: '📦', name: 'Move in/out' },
      { emoji: '🛋️', name: 'Sofa/Carpet' },
    ],
    'Gardening Services': [
      { emoji: '🌱', name: 'Maintenance' },
      { emoji: '🏞️', name: 'Landscaping' },
      { emoji: '🌸', name: 'Planting' },
    ],
    'Care & Personal Support': [
      { emoji: '👶', name: 'Child' },
      { emoji: '👴', name: 'Elderly' },
      { emoji: '🐕', name: 'Pet' },
      { emoji: '♿', name: 'Disability' },
      { emoji: '🤝', name: 'Personal' },
    ],
  };

  const quickBudgets = ['$50-100', '$100-200', '$200-300', '$300-500', '$500+'];
  const quickTemplates = [
    { emoji: '🏠', text: 'Multiple tasks' },
    { emoji: '🏢', text: 'Installation' },
    { emoji: '⚡', text: 'Repair work' },
    { emoji: '📅', text: 'Construction site' },
  ];

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
      Alert.alert('✅ Success!', 'Your bid has been posted!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }, 1000);
  };

  const addTemplate = (template) => {
    const newText = description ? `${description}\n${template}` : template;
    setDescription(newText);
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        {/* <Text style={styles.headerTitle}>Post a Bid</Text> */}
        <TouchableOpacity style={styles.helpBtn} onPress={() => Alert.alert('Help', 'Fill in the details and professionals will send you quotes')}>
          <Ionicons name="help-circle-outline" size={24} color="#667eea" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.iconContainer}>
            <Text style={styles.bigEmoji}>📢</Text>
          </View>

          {/* Main Category Selection */}
          <View style={styles.categoryCard}>
            <Text style={styles.questionText}>Choose a service category</Text>
            
            <View style={styles.categoryGrid}>
              {mainCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBtn,
                    selectedMainCategory === cat.name && { backgroundColor: cat.color }
                  ]}
                  onPress={() => selectMainCategory(cat.name)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[
                    styles.categoryText,
                    selectedMainCategory === cat.name && styles.categoryTextActive
                  ]}>
                    {cat.name.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Service Selection - SMALLER BUTTONS */}
          {selectedMainCategory && (
            <View style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>Select service type</Text>
              
              <View style={styles.smallTagsGrid}>
                {serviceTags[selectedMainCategory]?.map((tag, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.smallTag,
                      title === tag.name && styles.smallTagActive
                    ]}
                    onPress={() => selectServiceTag(tag.name)}
                  >
                    <Text style={styles.smallTagEmoji}>{tag.emoji}</Text>
                    <Text style={[
                      styles.smallTagText,
                      title === tag.name && styles.smallTagTextActive
                    ]}>
                      {tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.orTextSmall}>or type manually</Text>

              <TextInput
                style={styles.smallInput}
                placeholder="Enter service"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
              />
            </View>
          )}

          {/* Description Section */}
          <TouchableOpacity 
            style={styles.descriptionToggle}
            onPress={() => setShowDescription(!showDescription)}
          >
            <Ionicons 
              name={showDescription ? "chevron-up" : "add-circle-outline"} 
              size={22} 
              color="#667eea" 
            />
            <Text style={styles.descriptionToggleText}>
              {showDescription ? "Hide details" : "Add details (optional)"}
            </Text>
          </TouchableOpacity>

          {showDescription && (
            <View style={styles.descriptionCard}>
              <View style={styles.templatesRow}>
                {quickTemplates.map((template, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.templateChip}
                    onPress={() => addTemplate(template.text)}
                  >
                    <Text style={styles.templateEmoji}>{template.emoji}</Text>
                    <Text style={styles.templateText}>{template.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe your project..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}

          {/* Budget Section */}
          <View style={styles.budgetCard}>
            <Text style={styles.questionText}>Your budget?</Text>
            
            <View style={styles.budgetButtons}>
              {quickBudgets.map((btn) => (
                <TouchableOpacity
                  key={btn}
                  style={[styles.budgetBtn, budget === btn && styles.budgetBtnActive]}
                  onPress={() => setBudget(btn)}
                >
                  <Text style={[styles.budgetBtnText, budget === btn && styles.budgetBtnTextActive]}>
                    {btn}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.orText}>OR</Text>

            <TextInput
              style={styles.budgetInput}
              placeholder="Custom amount"
              placeholderTextColor="#9CA3AF"
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
          </View>

          {/* Location Section */}
          <View style={styles.locationCard}>
            <Text style={styles.locationLabel}>📍 Where do you need the service?</Text>
            <View style={styles.locationInputContainer}>
              <Ionicons name="location-outline" size={20} color="#667eea" />
              <TextInput
                style={styles.locationInput}
                placeholder="Enter your area"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Post Button */}
          <TouchableOpacity style={styles.postBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.postGradient}
            >
              {loading ? (
                <Text style={styles.postText}>Posting...</Text>
              ) : (
                <Text style={styles.postText}>Post Bid →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  helpBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  bigEmoji: {
    fontSize: 60,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  smallTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  smallTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  smallTagActive: {
    backgroundColor: '#667eea',
  },
  smallTagEmoji: {
    fontSize: 11,
  },
  smallTagText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  smallTagTextActive: {
    color: '#fff',
  },
  orTextSmall: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 11,
    marginVertical: 8,
  },
  smallInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  descriptionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  descriptionToggleText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  templatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 4,
  },
  templateEmoji: {
    fontSize: 12,
  },
  templateText: {
    fontSize: 11,
    color: '#6B7280',
  },
  descriptionInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  budgetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  budgetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  budgetBtnActive: {
    backgroundColor: '#667eea',
  },
  budgetBtnText: {
    fontSize: 12,
    color: '#6B7280',
  },
  budgetBtnTextActive: {
    color: '#fff',
  },
  orText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginVertical: 8,
    fontSize: 11,
  },
  budgetInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  postBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
  },
  postGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  postText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});