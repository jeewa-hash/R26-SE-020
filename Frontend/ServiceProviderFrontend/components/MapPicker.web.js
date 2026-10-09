import React from 'react';
import { View, Text } from 'react-native';

export default function MapPicker({ style }) {
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text>Map selection is available on iOS and Android.</Text>
    </View>
  );
}
