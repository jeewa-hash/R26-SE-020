import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function MapPickerModal({
  visible,
  tempLocation,
  onMapPress,
  onClose,
  onFindMe,
  findingLocation,
  onConfirm,
}) {
  const [latInput, setLatInput] = useState(String(tempLocation?.latitude || 6.9271));
  const [lngInput, setLngInput] = useState(String(tempLocation?.longitude || 79.8612));

  useEffect(() => {
    if (tempLocation?.latitude && tempLocation?.longitude) {
      setLatInput(String(Number(tempLocation.latitude).toFixed(4)));
      setLngInput(String(Number(tempLocation.longitude).toFixed(4)));
    }
  }, [tempLocation?.latitude, tempLocation?.longitude]);

  // Sri Lanka preset coordinates
  const presets = [
    { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
    { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
    { name: 'Galle', lat: 6.0535, lng: 80.221 },
    { name: 'Gampaha', lat: 7.084, lng: 79.9939 },
    { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
    { name: 'Kurunegala', lat: 7.4863, lng: 80.3623 },
    { name: 'Negombo', lat: 7.2008, lng: 79.8736 },
    { name: 'Matara', lat: 5.9549, lng: 80.555 },
  ];

  const handleApplyCoordinates = (lat, lng) => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      if (onMapPress) {
        onMapPress({
          nativeEvent: {
            coordinate: {
              latitude: parsedLat,
              longitude: parsedLng,
            },
          },
        });
      }
    }
  };

  const lat = tempLocation?.latitude || 6.9271;
  const lng = tempLocation?.longitude || 79.8612;

  // OpenStreetMap embed URL
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.03}%2C${lat - 0.03}%2C${lng + 0.03}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.mapCancelBtn} onPress={onClose}>
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Select Location</Text>

          <TouchableOpacity
            style={styles.mapFindMeBtn}
            onPress={onFindMe}
            disabled={findingLocation}
          >
            <MaterialIcons name="my-location" size={20} color="#fff" />
            <Text style={styles.btnText}>
              {findingLocation ? 'Locating...' : 'Find Me'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Web Interactive Map Frame */}
        <View style={styles.mapFrameContainer}>
          <iframe
            title="Location Picker Map"
            src={osmUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        </View>

        {/* Bottom Location Controls */}
        <View style={styles.controlsPanel}>
          <View style={styles.selectedBadge}>
            <MaterialIcons name="place" size={20} color="#6366f1" />
            <Text style={styles.selectedCoordsText}>
              Lat: {Number(lat).toFixed(4)} | Lng: {Number(lng).toFixed(4)}
            </Text>
          </View>

          {/* Quick Presets */}
          <Text style={styles.presetTitle}>Quick Select District / City:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetScroll}
          >
            {presets.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.presetChip,
                  Math.abs(lat - item.lat) < 0.01 &&
                    Math.abs(lng - item.lng) < 0.01 &&
                    styles.presetChipActive,
                ]}
                onPress={() => handleApplyCoordinates(item.lat, item.lng)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    Math.abs(lat - item.lat) < 0.01 &&
                      Math.abs(lng - item.lng) < 0.01 &&
                      styles.presetChipTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Manual Coordinate Inputs */}
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Latitude</Text>
              <TextInput
                style={styles.coordInput}
                value={latInput}
                onChangeText={setLatInput}
                onBlur={() => handleApplyCoordinates(latInput, lngInput)}
                keyboardType="numeric"
                placeholder="6.9271"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Longitude</Text>
              <TextInput
                style={styles.coordInput}
                value={lngInput}
                onChangeText={setLngInput}
                onBlur={() => handleApplyCoordinates(latInput, lngInput)}
                keyboardType="numeric"
                placeholder="79.8612"
              />
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => handleApplyCoordinates(latInput, lngInput)}
            >
              <Text style={styles.applyBtnText}>Set</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.confirmBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapFindMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 13,
  },
  mapFrameContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  controlsPanel: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedCoordsText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  presetTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  presetScroll: {
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  presetChipActive: {
    backgroundColor: '#6366f1',
  },
  presetChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  coordInput: {
    backgroundColor: '#0f172a',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: '#475569',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
