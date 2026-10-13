import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const variants = {
  primary: { bg: '#667eea', text: '#FFFFFF', border: '#667eea' },
  secondary: { bg: '#FFFFFF', text: '#667eea', border: '#E0E7FF' },
  success: { bg: '#10B981', text: '#FFFFFF', border: '#10B981' },
  danger: { bg: '#EF4444', text: '#FFFFFF', border: '#EF4444' },
  warning: { bg: '#F59E0B', text: '#FFFFFF', border: '#F59E0B' },
  ghost: { bg: 'transparent', text: '#6B7280', border: 'transparent' },
};

export default function ActionButton({ label, onPress, variant = 'primary', disabled, loading, icon }) {
  const C = variants[variant] || variants.primary;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: C.bg, borderColor: C.border, opacity: disabled ? 0.6 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color={C.text} />
      ) : (
        <>
          {icon ? <MaterialIcons name={icon} size={18} color={C.text} /> : null}
          <Text style={[styles.label, { color: C.text }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
