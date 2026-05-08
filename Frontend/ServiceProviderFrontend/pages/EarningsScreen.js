import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../theme';

export default function EarningsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>💰 Earnings Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  text: {
    fontSize: 18,
    color: Colors.textLight,
  },
});