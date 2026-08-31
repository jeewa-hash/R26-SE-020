import React, { useState, useContext } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { usePortfolio } from '../../context/PortfolioContext';
import { ThemeContext } from '../../context/ThemeContext';

export default function PortfolioTagScreen({ images, onClose }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { saveImages, updateImageTags } = usePortfolio();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tagMap, setTagMap] = useState(() => {
    const map = {};
    images.forEach((img) => {
      map[img.uri] = Array.isArray(img.tags) ? [...img.tags] : [];
    });
    return map;
  });
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const C = isDark
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', subCard: '#2a2a2a' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', subCard: '#F1F5F9' };

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const currentTags = tagMap[currentImage.uri] || currentImage.tags || [];
  const totalImages = images.length;
  const isLastImage = currentIndex === totalImages - 1;

  const updateCurrentTags = (newTags) => {
    setTagMap((prev) => ({ ...prev, [currentImage.uri]: newTags }));
  };

  const removeTag = (tag) => {
    updateCurrentTags(currentTags.filter((t) => t !== tag));
  };

  const addTag = () => {
    if (newTag.trim() && !currentTags.includes(newTag.trim())) {
      updateCurrentTags([...currentTags, newTag.trim()]);
      setNewTag('');
      setShowAddTag(false);
    }
  };

  const handleAccept = () => {
    setAccepting(true);
    setTimeout(() => {
      setAccepting(false);
      if (!isLastImage) {
        setCurrentIndex(currentIndex + 1);
        setShowAddTag(false);
      } else {
        // Save all images with their tags to portfolio
        saveImages(images, tagMap);

        // Update tags on backend for any image where tags were edited
        images.forEach((img) => {
          if (img.id && tagMap[img.uri]) {
            updateImageTags(img.id, tagMap[img.uri]);
          }
        });

        Alert.alert(
          '✅ Portfolio Saved!',
          `${images.length} image${images.length > 1 ? 's' : ''} added to your portfolio with AI predictions.`,
          [{ text: 'View Gallery', onPress: onClose }]
        );
      }
    }, 600);
  };

  const handleReject = () => {
    Alert.alert(
      'Remove Photo',
      'Remove this photo from upload?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (totalImages === 1) {
              onClose();
            } else if (isLastImage) {
              setCurrentIndex(currentIndex - 1);
            }
            const newMap = { ...tagMap };
            delete newMap[currentImage.uri];
            setTagMap(newMap);
          },
        },
      ]
    );
  };

  const confidence = currentImage.confidence || 0;
  const confColor = confidence >= 80 ? '#16A34A' : confidence >= 55 ? '#F59E0B' : '#DC2626';

  return (
    <Modal visible animationType="slide">
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>AI Prediction Review</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Dots */}
        <View style={[styles.dotsRow, { backgroundColor: C.card }]}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                i < currentIndex && styles.dotDone,
              ]}
            />
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Image */}
          <Image
            source={{ uri: currentImage.uri }}
            style={styles.image}
            resizeMode="cover"
          />

          <View style={styles.content}>
            {/* Model Prediction Header Box */}
            <View style={[styles.predictionCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.predictionTopRow}>
                <View style={styles.badgeLabelRow}>
                  <MaterialCommunityIcons name="robot" size={18} color="#6366F1" />
                  <Text style={[styles.serviceTitle, { color: C.text }]}>
                    {currentImage.label || currentImage.category || 'Home Service'}
                  </Text>
                </View>
                <View style={[styles.confPill, { backgroundColor: confColor + '20', borderColor: confColor }]}>
                  <Text style={[styles.confText, { color: confColor }]}>
                    {confidence > 0 ? `${confidence}% Confidence` : 'Predicted'}
                  </Text>
                </View>
              </View>

              {currentImage.specific_label ? (
                <View style={styles.specificWorkRow}>
                  <MaterialIcons name="auto-awesome" size={14} color="#7C3AED" />
                  <Text style={[styles.specificLabelText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                    Specific Work: {currentImage.specific_label}
                  </Text>
                </View>
              ) : null}

              {currentImage.category_group ? (
                <Text style={[styles.categoryGroupText, { color: C.textSub }]}>
                  Category Group: <Text style={{ fontWeight: '700', textTransform: 'capitalize' }}>{currentImage.category_group}</Text>
                </Text>
              ) : null}
            </View>

            {/* AI Suggested Tags Section */}
            <View style={styles.tagsHeaderRow}>
              <View style={styles.aiBadge}>
                <View style={styles.aiDot} />
                <Text style={styles.aiBadgeText}>AI GENERATED TAGS</Text>
              </View>
              <Text style={[styles.tagCountHeader, { color: C.textSub }]}>
                {currentTags.length} tag{currentTags.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Tags Wrap */}
            <View style={styles.tagsWrap}>
              {currentTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', borderColor: C.border }]}
                  onPress={() => removeTag(tag)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="local-offer" size={12} color="#6366F1" />
                  <Text style={[styles.tagText, { color: C.text }]}>{tag}</Text>
                  <MaterialIcons name="close" size={14} color={C.textSub} />
                </TouchableOpacity>
              ))}

              {showAddTag ? (
                <View style={[styles.addTagInput, { borderColor: '#6366F1', backgroundColor: C.card }]}>
                  <TextInput
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Tag name..."
                    placeholderTextColor={C.textSub}
                    style={[styles.tagInput, { color: C.text }]}
                    autoFocus
                    onSubmitEditing={addTag}
                  />
                  <TouchableOpacity onPress={addTag}>
                    <MaterialIcons name="check" size={18} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addTagBtn, { borderColor: C.border, backgroundColor: C.subCard }]}
                  onPress={() => setShowAddTag(true)}
                >
                  <MaterialIcons name="add" size={16} color={C.textSub} />
                  <Text style={[styles.addTagBtnText, { color: C.textSub }]}>Add Tag</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.hint, { color: C.textSub }]}>Tap × on any tag to remove · Tap "Add Tag" to add custom tags</Text>

            {/* Image Counter */}
            <Text style={[styles.counter, { color: C.textSub }]}>
              Image {currentIndex + 1} of {totalImages}
            </Text>

            {/* Accept Button */}
            <TouchableOpacity
              style={[styles.acceptBtn, accepting && styles.acceptBtnActive]}
              onPress={handleAccept}
            >
              <MaterialIcons
                name={accepting ? 'check-circle' : isLastImage ? 'save' : 'arrow-forward'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.acceptBtnText}>
                {accepting
                  ? 'Saving...'
                  : isLastImage
                  ? 'Accept & Save to Portfolio'
                  : `Accept & Next (${currentIndex + 1}/${totalImages})`
                }
              </Text>
            </TouchableOpacity>

            {/* Reject Button */}
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
              <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
              <Text style={styles.rejectBtnText}>Remove This Photo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, paddingBottom: 10, paddingTop: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { width: 22, backgroundColor: '#6366F1' },
  dotDone: { backgroundColor: '#A5B4FC' },
  image: { width: '100%', height: 260 },
  content: { padding: 18 },

  predictionCard: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  predictionTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  badgeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceTitle: { fontSize: 17, fontWeight: '700' },
  confPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1,
  },
  confText: { fontSize: 11, fontWeight: '700' },
  specificWorkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 4,
  },
  specificLabelText: { fontSize: 13, fontWeight: '600' },
  categoryGroupText: { fontSize: 12, marginTop: 2 },

  tagsHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC',
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4,
  },
  aiDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#16A34A' },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  tagCountHeader: { fontSize: 12 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  tagText: { fontSize: 13, fontWeight: '600' },
  addTagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  addTagBtnText: { fontSize: 13, fontWeight: '500' },
  addTagInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, gap: 6,
  },
  tagInput: { fontSize: 13, minWidth: 80, padding: 0 },
  hint: { fontSize: 11, marginBottom: 12, fontStyle: 'italic' },
  counter: { fontSize: 12, textAlign: 'center', marginBottom: 16 },

  acceptBtn: {
    backgroundColor: '#16A34A', borderRadius: 14, paddingVertical: 15,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  acceptBtnActive: { backgroundColor: '#15803D' },
  acceptBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  rejectBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 6, paddingVertical: 10,
  },
  rejectBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
});
