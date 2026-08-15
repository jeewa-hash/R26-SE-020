import React from 'react';
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { usePortfolio } from '../../context/PortfolioContext';

const { width, height } = Dimensions.get('window');

export default function ImageDetailModal({ image, onClose }) {
  const { deleteImage } = usePortfolio();

  const handleDelete = () => {
    Alert.alert(
      'Delete Image',
      'Remove this image from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteImage(image.id);
            onClose();
          },
        },
      ]
    );
  };

  if (!image) return null;

  return (
    <Modal visible animationType="fade" transparent>
      <View style={styles.overlay}>

        {/* Top Actions */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <MaterialIcons name="delete-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Image
          source={{ uri: image.uri }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Tags Info */}
        <View style={styles.infoCard}>
          <View style={styles.aiBadge}>
            <View style={styles.aiDot} />
            <Text style={styles.aiBadgeText}>AI TAGS</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tagsRow}>
              {image.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.uploadDate}>
            Uploaded {new Date(image.uploadedAt).toLocaleDateString('en-US', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  image: { width, height: height * 0.55 },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 20,
    margin: 16, padding: 16,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12,
  },
  aiDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: {
    backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  uploadDate: { fontSize: 12, color: Colors.textLight },
});