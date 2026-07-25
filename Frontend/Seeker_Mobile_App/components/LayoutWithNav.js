// components/LayoutWithNav.js
import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import BottomNav from './BottomNav';

const LayoutWithNav = ({ children, showNav = true }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
      {showNav && <BottomNav />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingBottom: 70, // Space for bottom nav
  },
});

export default LayoutWithNav;