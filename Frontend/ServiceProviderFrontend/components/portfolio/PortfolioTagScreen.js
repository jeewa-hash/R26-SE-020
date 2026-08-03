import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { usePortfolio } from '../../context/PortfolioContext';

const AI_TAGS_POOL = [
  ['Pipe Repair', 'Residential', 'Emergency', 'Kitchen', 'PVC'],
  ['Electrical', 'Wiring', 'Installation', 'Safety', 'Indoor'],
  ['Bathroom', 'Tiles', 'Renovation', 'Modern', 'Waterproof'],
  ['Painting', 'Interior', 'Wall Finish', 'Emulsion', 'Prep Work'],
  ['AC Repair', 'Cooling', 'Maintenance', 'Split Unit', 'Service'],
];

export default function PortfolioTagScreen({ images, onClose }) {
  const { saveImages } = usePortfolio();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tagMap, setTagMap] = useState(() => {
    const map = {};
    images.forEach((img, i) => {
      map[img.uri] = AI_TAGS_POOL[i % AI_TAGS_POOL.length];
    });
    return map;
  });
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const currentImage = images[currentIndex];
  const currentTags = tagMap[currentImage.uri] || [];
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
        Alert.alert(
          '✅ Portfolio Updated!',
          `${images.length} image${images.length > 1 ? 's' : ''} added to your portfolio gallery.`,
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
            // Remove from tagMap
            const newMap = { ...tagMap };
            delete newMap[currentImage.uri];
            setTagMap(newMap);
          },
        },
      ]
    );
  };

  return (
    <Modal visible animationType="slide">
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Portfolio</Text>
          <TouchableOpacity style={styles.shareBtn}>
            <MaterialIcons name="upload" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Progress Dots */}
        <View style={styles.dotsRow}>
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

            {/* AI Tag Badge */}
            <View style={styles.aiBadge}>
              <View style={styles.aiDot} />
              <Text style={styles.aiBadgeText}>AI SUGGESTED TAGS</Text>
            </View>

            {/* Tags */}
            <View style={styles.tagsWrap}>
              {currentTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.tag}
                  onLongPress={() => removeTag(tag)}
                >
                  <Text style={styles.tagText}>{tag}</Text>
                  <MaterialIcons name="close" size={12} color={Colors.textLight} />
                </TouchableOpacity>
              ))}

              {showAddTag ? (
                <View style={styles.addTagInput}>
                  <TextInput
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Tag name..."
                    style={styles.tagInput}
                    autoFocus
                    onSubmitEditing={addTag}
                  />
                  <TouchableOpacity onPress={addTag}>
                    <MaterialIcons name="check" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addTagBtn}
                  onPress={() => setShowAddTag(true)}
                >
                  <MaterialIcons name="add" size={16} color={Colors.textLight} />
                  <Text style={styles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.hint}>Tap × to remove · Long press to delete</Text>

            {/* Image Counter */}
            <Text style={styles.counter}>
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
                color={Colors.white}
              />
              <Text style={styles.acceptBtnText}>
                {accepting
                  ? 'Saving...'
                  : isLastImage
                  ? 'Accept & Save to Gallery'
                  : `Accept & Next (${currentIndex + 1}/${totalImages})`
                }
              </Text>
            </TouchableOpacity>

            {/* Edit Button */}
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit Suggestions</Text>
              <MaterialIcons name="edit" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* Reject Button */}
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
              <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
              <Text style={styles.rejectBtnText}>Reject & Remove Photo</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  shareBtn: { padding: 4 },
  dotsRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 6, paddingBottom: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { width: 20, backgroundColor: '#16A34A' },
  dotDone: { backgroundColor: '#86EFAC' },
  image: { width: '100%', height: 260 },
  content: { padding: 20 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16,
  },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  aiBadgeText: { fontSize: 11, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  tagText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  addTagBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#CBD5E1',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  addTagBtnText: { fontSize: 13, color: Colors.textLight },
  addTagInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6,
  },
  tagInput: { fontSize: 13, minWidth: 80 },
  hint: { fontSize: 11, color: Colors.textLight, marginBottom: 8 },
  counter: { fontSize: 12, color: Colors.textLight, textAlign: 'center', marginBottom: 20 },
  acceptBtn: {
    backgroundColor: '#16A34A', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  acceptBtnActive: { backgroundColor: '#15803D' },
  acceptBtnText: { color: Colors.white, fontSize: 15, fontWeight: 'bold' },
  editBtn: {
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 14,
    paddingVertical: 16, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  editBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  rejectBtn: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6, paddingVertical: 12,
  },
  rejectBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
});