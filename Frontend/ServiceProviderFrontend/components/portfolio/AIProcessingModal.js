import React, { useEffect, useRef, useContext } from 'react';
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
import { ThemeContext } from '../../context/ThemeContext';

export default function AIProcessingModal({ visible, progress, imageCount, onCancel }) {
  const { isDark } = useContext(ThemeContext) || {};
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const C = isDark
    ? { card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', track: '#2c2c2e' }
    : { card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', track: '#E2E8F0' };

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
        <View style={[styles.card, { backgroundColor: C.card }]}>

          {/* AI Badge */}
          <View style={styles.aiBadge}>
            <View style={styles.aiDot} />
            <Text style={styles.aiText}>WorkWave AI</Text>
          </View>

          {/* Spinner */}
          <Animated.View style={[styles.spinnerWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.spinnerBg, { backgroundColor: isDark ? '#1F2937' : '#EFF6FF' }]}>
              <Animated.View style={{ transform: [{ rotate }] }}>
                <MaterialIcons name="refresh" size={48} color="#6366F1" />
              </Animated.View>
            </View>
            <View style={[styles.sparkBadge, { borderColor: C.card }]}>
              <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Text */}
          <Text style={[styles.title, { color: C.text }]}>Analyzing & Predicting...</Text>
          <Text style={[styles.subtitle, { color: C.textSub }]}>
            ML Engine is running EfficientNet + CLIP on {imageCount} {imageCount === 1 ? 'photo' : 'photos'} to detect service type, specific work, and tags.
          </Text>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: C.textSub }]}>AI INFERENCE PROGRESS</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.track }]}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>

          {/* Cancel */}
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={onCancel}>
            <MaterialIcons name="close" size={18} color={C.textSub} />
            <Text style={[styles.cancelText, { color: C.textSub }]}>Cancel Process</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  card: {
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
    marginBottom: 22,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  aiText: { fontSize: 11, fontWeight: '800', color: '#16A34A', letterSpacing: 1 },

  // Spinner
  spinnerWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  spinnerBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
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
  },

  // Text
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
  },

  // Progress
  progressSection: { width: '100%', marginBottom: 22 },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6366F1',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },

  // Cancel
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 32,
    width: '100%',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
});