import React, { useContext, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { Portal } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { providerNotificationPresentation } from '../utils/providerNotificationPresentation';

export default function ProviderNotificationBanner({ notification, navigation, onDismiss }) {
  const { isDark } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  useEffect(() => { translateY.setValue(0); }, [notification?._id, translateY]);
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dy < -8 && Math.abs(dy) > Math.abs(dx),
    onPanResponderMove: (_, { dy }) => translateY.setValue(Math.min(0, dy)),
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy < -40 || vy < -0.7) {
        Animated.timing(translateY, { toValue: -350, duration: 160, useNativeDriver: true })
          .start(({ finished }) => { if (finished) dismiss.current(); });
      } else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  if (!notification) return null;
  const action = providerNotificationPresentation(notification);
  const accent = isDark ? '#86EFAC' : '#166534';
  return (
    <Portal>
      <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 12 }]}>
        <Animated.View {...swipe.panHandlers} accessibilityLiveRegion="polite" style={[styles.card, { transform: [{ translateY }] }, { backgroundColor: isDark ? '#18251E' : '#FFFFFF', borderColor: isDark ? '#355541' : '#D5E8DB' }]}>
          <View style={[styles.icon, { backgroundColor: isDark ? '#254332' : '#EAF6EE' }]}><MaterialIcons name={action.icon} size={23} color={accent} /></View>
          <View style={styles.content}>
            <Text style={[styles.eyebrow, { color: accent }]}>SERVICE UPDATE</Text>
            <Text style={[styles.title, { color: isDark ? '#F0FDF4' : '#182B20' }]} numberOfLines={2}>{notification.title}</Text>
            <Text style={[styles.message, { color: isDark ? '#B8CABB' : '#526258' }]} numberOfLines={3}>{notification.message}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={() => { onDismiss(); navigation.navigate(action.route, action.params); }}>
              <Text style={styles.actionText}>{action.label}</Text><MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dismiss notification" hitSlop={8} onPress={onDismiss} style={styles.close}><MaterialIcons name="close" size={20} color={isDark ? '#B8CABB' : '#64746A'} /></TouchableOpacity>
        </Animated.View>
      </View>
    </Portal>
  );
}
const styles = StyleSheet.create({
  container: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  card: { width: '100%', maxWidth: 480, borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: 'row', gap: 12, shadowColor: '#143421', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 14, elevation: 8 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: '700' }, message: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  action: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#15803D', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, close: { padding: 3, alignSelf: 'flex-start' },
});
