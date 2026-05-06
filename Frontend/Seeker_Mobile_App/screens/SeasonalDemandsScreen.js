// screens/SeasonalDemandsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { seasonalServices } from '../data/seasonalData';

const { width } = Dimensions.get('window');

export default function SeasonalDemandsScreen() {
  const navigation = useNavigation();

  const getSeasonColor = (season) => {
    if (season.includes('Summer')) return '#FF6B6B';
    if (season.includes('Monsoon')) return '#45B7D1';
    if (season.includes('Winter')) return '#4ECDC4';
    if (season.includes('Spring')) return '#96CEB4';
    return '#667eea';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seasonal Offers</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Banner */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <Text style={styles.bannerEmoji}>🔥</Text>
        <Text style={styles.bannerTitle}>Limited Time Offers</Text>
        <Text style={styles.bannerText}>Grab the best deals before they're gone!</Text>
      </LinearGradient>

      {/* Service List */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {seasonalServices.map((service) => (
          <TouchableOpacity key={service.id} style={styles.serviceCard} activeOpacity={0.8}>
            <Image source={{ uri: service.image }} style={styles.serviceImage} />
            
            <View style={styles.serviceInfo}>
              <View style={styles.serviceHeader}>
                <View style={[styles.seasonBadge, { backgroundColor: getSeasonColor(service.season) + '20' }]}>
                  <Text style={[styles.seasonBadgeText, { color: getSeasonColor(service.season) }]}>
                    {service.season}
                  </Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{service.discount}</Text>
                </View>
              </View>
              
              <Text style={styles.serviceTitle}>{service.title}</Text>
              <Text style={styles.serviceCategory}>{service.category}</Text>
              <Text style={styles.servicePrice}>{service.price}</Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.quoteButton}>
                  <Text style={styles.quoteButtonText}>Get Quote</Text>
                  <Ionicons name="arrow-forward" size={14} color="#667eea" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchButton: {
    padding: 4,
  },
  banner: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 13,
    color: '#ffffffCC',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceImage: {
    width: 110,
    height: 130,
  },
  serviceInfo: {
    flex: 1,
    padding: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seasonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  seasonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  quoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  quoteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
});