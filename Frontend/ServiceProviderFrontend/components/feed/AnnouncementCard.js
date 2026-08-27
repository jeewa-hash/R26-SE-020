import React from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import banner1 from '../../assets/portfolio_banner.png';
import banner2 from '../../assets/Boost_banner.png';
import banner3 from '../../assets/jobEarn_banner.png';

const { width } = Dimensions.get('window');
export const CARD_WIDTH = width - 15;

export const ANNOUNCEMENTS = [
  { id: '1', image: banner1 },
  { id: '2', image: banner2 },
  { id: '3', image: banner3 },
];

export default function AnnouncementCard({ item }) {
  return (
    <View style={styles.card}>
      <Image source={item?.image} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: 220, // Adjust card height as needed
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});