import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';

export default function HelpScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    { id: 1, question: "How do I create a service request?", answer: "Go to the Create Post screen, fill in the details about your service needs, add photos, and submit. Professionals will then respond to your request.", category: "Getting Started" },
    { id: 2, question: "How do I place a bid?", answer: "Browse the Feed screen, find a service request you're interested in, and click 'Place a Bid'. Enter your bid amount and message to the customer.", category: "Bidding" },
    { id: 3, question: "How are star points earned?", answer: "You earn star points by completing services, referring friends, posting bids, and engaging with the platform. Points can be redeemed for discounts.", category: "Rewards" },
    { id: 4, question: "How to cancel a booking?", answer: "Go to My Bookings, select the booking you want to cancel, and click 'Cancel'. Please note cancellation fees may apply.", category: "Bookings" },
    { id: 5, question: "Is my payment information secure?", answer: "Yes, we use industry-standard encryption to protect your payment information. We never store your full card details.", category: "Security" },
    { id: 6, question: "How do I contact a provider?", answer: "You can message providers directly through the chat feature in your bookings or from their profile page.", category: "Communication" },
    { id: 7, question: "What is the refund policy?", answer: "Refunds are processed within 5-7 business days based on the service provider's cancellation policy.", category: "Payments" },
  ];

  const contactOptions = [
    { icon: 'chatbubble', title: 'Live Chat', subtitle: 'Available 24/7', action: 'chat', color: '#667eea', gradient: ['#667eea', '#764ba2'] },
    { icon: 'mail', title: 'Email Us', subtitle: 'support@servicehub.com', action: 'email', color: '#4ECDC4', gradient: ['#4ECDC4', '#44B3A5'] },
    { icon: 'call', title: 'Call Us', subtitle: '+94 77 123 4567', action: 'call', color: '#45B7D1', gradient: ['#45B7D1', '#3498DB'] },
  ];

  const handleContact = (action, value) => {
    if (action === 'email') {
      Linking.openURL(`mailto:${value}`);
    } else if (action === 'call') {
      Linking.openURL(`tel:${value}`);
    } else if (action === 'chat') {
      navigation.navigate('ChatListScreen');
    }
  };

  const categories = [...new Set(faqs.map(faq => faq.category))];

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea15', '#764ba215']}
          style={styles.heroSection}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="help-circle" size={40} color="#667eea" />
          </View>
          <Text style={[styles.heroTitle, isDarkMode && styles.textDark]}>How can we help you?</Text>
          <Text style={[styles.heroSubtitle, isDarkMode && styles.textMutedDark]}>
            Find answers to common questions below
          </Text>
        </LinearGradient>

        {/* Contact Options */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Contact Support</Text>
        <View style={styles.contactGrid}>
          {contactOptions.map((option, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.contactCard, isDarkMode && styles.contactCardDark]}
              onPress={() => handleContact(option.action, option.subtitle)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={option.gradient}
                style={styles.contactIcon}
              >
                <Ionicons name={option.icon} size={28} color="#fff" />
              </LinearGradient>
              <Text style={[styles.contactTitle, isDarkMode && styles.textDark]}>{option.title}</Text>
              <Text style={[styles.contactSubtitle, isDarkMode && styles.textMutedDark]}>{option.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Browse by Category */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Browse by Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {categories.map((category, index) => (
            <TouchableOpacity key={index} style={[styles.categoryChip, isDarkMode && styles.categoryChipDark]}>
              <Text style={[styles.categoryChipText, isDarkMode && styles.textDark]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQs */}
        <View style={styles.faqHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Frequently Asked Questions</Text>
          <Text style={[styles.faqCount, isDarkMode && styles.textMutedDark]}>{faqs.length} articles</Text>
        </View>

        <View style={[styles.faqContainer, isDarkMode && styles.faqContainerDark]}>
          {faqs.map((faq) => (
            <View key={faq.id} style={[styles.faqItem, isDarkMode && styles.faqItemDark]}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                activeOpacity={0.7}
              >
                <View style={styles.faqQuestionLeft}>
                  <View style={[styles.faqIcon, { backgroundColor: '#667eea15' }]}>
                    <Ionicons name="help-circle-outline" size={18} color="#667eea" />
                  </View>
                  <Text style={[styles.faqQuestionText, isDarkMode && styles.textDark]}>{faq.question}</Text>
                </View>
                <Ionicons
                  name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#667eea"
                />
              </TouchableOpacity>
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswerContainer}>
                  <Text style={[styles.faqAnswer, isDarkMode && styles.textMutedDark]}>{faq.answer}</Text>
                  <TouchableOpacity style={styles.faqHelpfulBtn}>
                    <Text style={styles.faqHelpfulText}>Was this helpful?</Text>
                    <View style={styles.faqHelpfulIcons}>
                      <Ionicons name="thumbs-up-outline" size={16} color="#667eea" />
                      <Ionicons name="thumbs-down-outline" size={16} color="#667eea" />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    paddingBottom: 80,
  },
  heroSection: {
    margin: 16,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  contactGrid: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  contactCardDark: {
    backgroundColor: '#16213e',
  },
  contactIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  categoryChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryChipDark: {
    backgroundColor: '#16213e',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  faqCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  faqContainerDark: {
    backgroundColor: '#16213e',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  faqItemDark: {
    borderBottomColor: '#2d3561',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  faqQuestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  faqIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  faqHelpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  faqHelpfulText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  faqHelpfulIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});