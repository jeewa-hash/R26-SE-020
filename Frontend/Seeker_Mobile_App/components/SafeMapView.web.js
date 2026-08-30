import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Marker = ({ children }) => children || null;
export const Callout = ({ children }) => children || null;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const SafeMapView = forwardRef(function SafeMapView(
  { style, children, testID },
  ref
) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    animateCamera: () => {},
    fitToElements: () => {},
    fitToSuppliedMarkers: () => {},
    fitToCoordinates: () => {},
    setCamera: () => {},
  }));

  return (
    <View style={[styles.fallback, style]} testID={testID}>
      <Text style={styles.text}>
        The map picker is not available in the web browser. Please use the mobile app for interactive map selection.
      </Text>
      {children}
    </View>
  );
});

export default SafeMapView;

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    minHeight: 200,
  },
  text: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
});
