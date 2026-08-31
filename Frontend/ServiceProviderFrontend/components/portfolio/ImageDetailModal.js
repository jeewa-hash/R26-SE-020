import React, { useContext } from 'react';
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
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { usePortfolio } from '../../context/PortfolioContext';
import { ThemeContext } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function ImageDetailModal({ image, onClose }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { deleteImage } = usePortfolio();

  const C = isDark
    ? { card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', tagBg: '#2a2a2a' }
    : { card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', tagBg: '#F1F5F9' };

  const handleDelete = () => {
    Alert.alert(
      'Delete Image',
      'Remove this image from your portfolio permanently?',
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

  const confidence = image.confidence || 0;
  const confColor = confidence >= 80 ? '#16A34A' : confidence >= 55 ? '#F59E0B' : '#DC2626';

  return (
    <Modal visible animationType="fade" transparent>
      <View style={styles.overlay}>

        {/* Top Actions */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
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

        {/* Tags & Prediction Info Card */}
        <View style={[styles.infoCard, { backgroundColor: C.card }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.serviceNameRow}>
              <MaterialCommunityIcons name="robot" size={16} color="#6366F1" />
              <Text style={[styles.serviceTitle, { color: C.text }]}>
                {image.label || image.category || 'Portfolio Item'}
              </Text>
            </View>

            {confidence > 0 ? (
              <View style={[styles.confPill, { backgroundColor: confColor + '20', borderColor: confColor }]}>
                <Text style={[styles.confText, { color: confColor }]}>{confidence}% Conf.</Text>
              </View>
            ) : null}
          </View>

          {image.specific_label ? (
            <View style={styles.specificWorkRow}>
              <MaterialIcons name="auto-awesome" size={13} color="#7C3AED" />
              <Text style={[styles.specificText, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                {image.specific_label}
              </Text>
            </View>
          ) : null}

          {/* Tags */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
            <View style={styles.tagsRow}>
              {Array.isArray(image.tags) && image.tags.length > 0 ? (
                image.tags.map((tag) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: C.tagBg, borderColor: C.border }]}>
                    <MaterialIcons name="local-offer" size={11} color="#6366F1" />
                    <Text style={[styles.tagText, { color: C.text }]}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: C.textSub, fontSize: 12, fontStyle: 'italic' }}>No tags assigned</Text>
              )}
            </View>
          </ScrollView>

          <Text style={[styles.uploadDate, { color: C.textSub }]}>
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  image: { width, height: height * 0.52 },
  infoCard: {
    borderRadius: 20,
    margin: 16, padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  serviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceTitle: { fontSize: 16, fontWeight: '700' },
  confPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1,
  },
  confText: { fontSize: 11, fontWeight: '700' },
  specificWorkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, marginBottom: 4,
  },
  specificText: { fontSize: 13, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', gap: 6 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 0.5, borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontSize: 12, fontWeight: '600' },
  uploadDate: { fontSize: 11, marginTop: 4 },
});