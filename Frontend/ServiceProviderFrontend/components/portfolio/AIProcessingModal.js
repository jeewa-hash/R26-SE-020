import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';

export default function AIProcessingModal({ visible, progress, imageCount, onCancel }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Spin animation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    if (visible) spin.start();
    return () => spin.stop();
  }, [visible]);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    if (visible) pulse.start();
    return () => pulse.stop();
  }, [visible]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <View style={styles.aiDot} />
            <Text style={styles.aiText}>LOCALPRO AI</Text>
          </View>

          {/* Spinner */}
          <Animated.View style={[styles.spinnerWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.spinnerBg}>
              <Animated.View style={{ transform: [{ rotate }] }}>
                <MaterialIcons name="refresh" size={48} color={Colors.primary} />
              </Animated.View>
            </View>
            <View style={styles.sparkBadge}>
              <MaterialIcons name="auto-awesome" size={14} color={Colors.white} />
            </View>
          </Animated.View>

          {/* Text */}
          <Text style={styles.title}>Classifying Images...</Text>
          <Text style={styles.subtitle}>
            AI is analyzing your {imageCount} new {imageCount === 1 ? 'photo' : 'photos'} to
            group them by service type.
          </Text>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>SYSTEM PROGRESS</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <MaterialIcons name="close" size={18} color={Colors.textLight} />
            <Text style={styles.cancelText}>Cancel Process</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },

  // AI Badge
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 24,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  aiText: { fontSize: 11, fontWeight: '800', color: '#16A34A', letterSpacing: 1 },

  // Spinner
  spinnerWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  spinnerBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },

  // Text
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Progress
  progressSection: { width: '100%', marginBottom: 24 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 0.8,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },

  // Cancel
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, color: Colors.textLight, fontWeight: '600' },
});