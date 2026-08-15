import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';

export default function PaymentScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const paymentMethods = [
    { id: 'card', name: 'Credit/Debit Card', icon: 'card', last4: '**** 1234', brand: 'Visa', expiry: '12/26' },
    { id: 'paypal', name: 'PayPal', icon: 'logo-paypal', email: 'user@example.com' },
    { id: 'cash', name: 'Cash on Delivery', icon: 'cash', info: 'Pay when service is complete' },
  ];

  const handleAddCard = () => {
    if (!cardNumber || !cardName || !expiryDate || !cvv) {
      Alert.alert('Error', 'Please fill in all card details');
      return;
    }
    Alert.alert('Success', 'Card added successfully');
    setShowAddCard(false);
    setCardNumber('');
    setCardName('');
    setExpiryDate('');
    setCvv('');
  };

  const formatCardNumber = (text) => {
    const cleaned = text.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    if (groups) {
      return groups.join(' ');
    }
    return text;
  };

  const formatExpiry = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

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
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddCard(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Default Payment Method */}
        <View style={styles.defaultSection}>
          <Text style={[styles.defaultTitle, isDarkMode && styles.textMutedDark]}>Default Payment Method</Text>
          <View style={styles.defaultCard}>
            <LinearGradient
              colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.defaultCardGradient}
            >
              <View style={styles.defaultCardHeader}>
                <Ionicons name="card" size={24} color="#fff" />
                <Text style={styles.defaultCardBrand}>Visa</Text>
              </View>
              <Text style={styles.defaultCardNumber}>**** **** **** 1234</Text>
              <View style={styles.defaultCardFooter}>
                <Text style={styles.defaultCardName}>Tashmi Perera</Text>
                <Text style={styles.defaultCardExpiry}>12/26</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Saved Payment Methods */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Saved Payment Methods</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentCard, 
              selectedMethod === method.id && styles.selectedCard,
              isDarkMode && styles.paymentCardDark
            ]}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.7}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIcon, { backgroundColor: isDarkMode ? '#2d3561' : '#667eea15' }]}>
                <Ionicons name={method.icon} size={24} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.paymentName, isDarkMode && styles.textDark]}>{method.name}</Text>
                <Text style={[styles.paymentDetails, isDarkMode && styles.textMutedDark]}>
                  {method.last4 || method.email || method.info}
                </Text>
                {method.brand && (
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{method.brand}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.paymentRight}>
              {method.id === 'card' && (
                <TouchableOpacity style={styles.editButton}>
                  <Ionicons name="create-outline" size={18} color="#667eea" />
                </TouchableOpacity>
              )}
              <View style={[styles.radioButton, selectedMethod === method.id && styles.radioSelected]}>
                {selectedMethod === method.id && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* Add New Card Button */}
        <TouchableOpacity 
          style={styles.addCardButton}
          onPress={() => setShowAddCard(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#F3F4F6', '#E5E7EB']}
            style={styles.addCardGradient}
          >
            <Ionicons name="add-circle-outline" size={24} color="#667eea" />
            <Text style={styles.addCardText}>Add New Payment Method</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={[styles.securityText, isDarkMode && styles.textMutedDark]}>
            Your payment information is encrypted and secure
          </Text>
        </View>
      </ScrollView>

      {/* Add Card Modal */}
      {showAddCard && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
            <LinearGradient
              colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Add New Card</Text>
              <TouchableOpacity onPress={() => setShowAddCard(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Card Number</Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Cardholder Name</Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  placeholder="Tashmi Perera"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  value={cardName}
                  onChangeText={setCardName}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Expiry Date</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.inputDark]}
                    placeholder="MM/YY"
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    value={expiryDate}
                    onChangeText={(text) => setExpiryDate(formatExpiry(text))}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>CVV</Text>
                  <TextInput
                    style={[styles.input, isDarkMode && styles.inputDark]}
                    placeholder="123"
                    placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveCardButton} onPress={handleAddCard}>
                <LinearGradient
                  colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
                  style={styles.saveCardGradient}
                >
                  <Text style={styles.saveCardText}>Save Card</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  defaultSection: {
    marginBottom: 24,
  },
  defaultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  defaultCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  defaultCardGradient: {
    padding: 20,
  },
  defaultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  defaultCardBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  defaultCardNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 20,
  },
  defaultCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defaultCardName: {
    fontSize: 12,
    color: '#ffffffcc',
  },
  defaultCardExpiry: {
    fontSize: 12,
    color: '#ffffffcc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentCardDark: {
    backgroundColor: '#16213e',
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardBadge: {
    backgroundColor: '#667eea15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cardBadgeText: {
    fontSize: 10,
    color: '#667eea',
    fontWeight: '500',
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 4,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#667eea',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  addCardButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 20,
  },
  addCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalContainerDark: {
    backgroundColor: '#16213e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
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
  inputDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
    color: '#fff',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  saveCardButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 30,
  },
  saveCardGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});