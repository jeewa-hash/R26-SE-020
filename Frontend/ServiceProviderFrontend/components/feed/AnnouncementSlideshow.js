import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Colors } from '../../theme';
import { ANNOUNCEMENTS } from '../../constants/feedData';
import AnnouncementCard from './AnnouncementCard';

export default function AnnouncementSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeIndex + 1) % ANNOUNCEMENTS.length;
      setActiveIndex(next);
      flatRef.current?.scrollToIndex({ index: next, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [activeIndex]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={ANNOUNCEMENTS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AnnouncementCard item={item} />}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / (e.nativeEvent.layoutMeasurement.width)
          );
          setActiveIndex(index);
        }}
      />
      <View style={styles.dotsRow}>
        {ANNOUNCEMENTS.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { width: 18, backgroundColor: Colors.primary },
});