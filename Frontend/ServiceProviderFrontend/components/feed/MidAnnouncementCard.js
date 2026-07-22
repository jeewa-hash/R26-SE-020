import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import i18n from '../../locales';
import { MID_ANNOUNCEMENT } from '../../constants/feedData';

const { width } = Dimensions.get('window');

export default function MidAnnouncementCard() {
  const isSi = i18n.language === 'si';
  const title = isSi ? MID_ANNOUNCEMENT.titleSi : MID_ANNOUNCEMENT.title;
  const message = isSi ? MID_ANNOUNCEMENT.messageSi : MID_ANNOUNCEMENT.message;
  const { color, bg, icon } = MID_ANNOUNCEMENT;

  return (
    <TouchableOpacity activeOpacity={0.95}>
      <LinearGradient
        colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
          {/* Decorative Circle */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#7C3AED', '#8B5CF6']}
                style={styles.iconGradient}
              >
                <Text style={styles.icon}>{icon}</Text>
              </LinearGradient>
            </View>
            <View style={styles.aiBadge}>
              <View style={styles.aiDot} />
              <Text style={styles.aiBadgeText}>AI SUGGESTION</Text>
              <MaterialIcons name="auto-awesome" size={12} color="#7C3AED" />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <MaterialIcons name="trending-up" size={16} color="#10B981" />
              <Text style={styles.featureText}>+32% Response</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <MaterialIcons name="visibility" size={16} color="#3B82F6" />
              <Text style={styles.featureText}>2.5k Views</Text>
            </View>
            <View style={styles.featureDivider} />
            <View style={styles.featureItem}>
              <MaterialIcons name="star" size={16} color="#F59E0B" />
              <Text style={styles.featureText}>Top Rated</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btn}>
            <LinearGradient
              colors={['#7C3AED', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnText}>Optimize My Service</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradientBorder: {
    borderRadius: 20,
    padding: 1.5,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  card: {
    borderRadius: 19,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3E8FF',
    opacity: 0.6,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  featureDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  btn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});