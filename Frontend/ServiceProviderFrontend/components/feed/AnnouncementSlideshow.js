import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, Dimensions } from 'react-native';
import AnnouncementCard, { ANNOUNCEMENTS, CARD_WIDTH } from './AnnouncementCard';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = CARD_WIDTH + 16; // card + marginRight

export default function AnnouncementSlideshow({ onPressItem }) {
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
    <View style={styles.wrapper}>
      <FlatList
        ref={flatRef}
        data={ANNOUNCEMENTS}
        horizontal
        pagingEnabled={false}
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <AnnouncementCard
              item={item}
              onPress={() => onPressItem?.(item)}
            />
          </View>
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / ITEM_WIDTH);
          setActiveIndex(index);
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
      />

      {/* ── Dot indicators ── */}
      <View style={styles.dotsRow}>
        {ANNOUNCEMENTS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  itemWrap: {
    marginRight: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#b80bb8',
  },
});