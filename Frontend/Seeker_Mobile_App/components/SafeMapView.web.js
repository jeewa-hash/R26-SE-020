import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Marker = () => null;

export default function SafeMapView({ style }) {
  return (
    <View style={[style, styles.fallback]}>
      <Text style={styles.text}>
        The map picker is not available in the web browser. Please use the mobile app for location selection.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  text: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});