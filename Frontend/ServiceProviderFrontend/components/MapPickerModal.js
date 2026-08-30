import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.fullScreenMapContainer}>
        <MapView
          style={styles.fullScreenMap}
          region={tempLocation}
          onPress={onMapPress}
        >
          <Marker
            coordinate={{
              latitude: tempLocation.latitude,
              longitude: tempLocation.longitude,
            }}
          />
        </MapView>

        <View style={styles.mapTopButtons}>
          <TouchableOpacity style={styles.mapCancelBtn} onPress={onClose}>
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.mapBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mapFindMeBtn}
            onPress={onFindMe}
            disabled={findingLocation}
          >
            <MaterialIcons name="my-location" size={20} color="#fff" />
            <Text style={styles.mapBtnText}>
              {findingLocation ? 'Locating...' : 'Find Me'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapBottomButtons}>
          <TouchableOpacity style={styles.mapConfirmBtn} onPress={onConfirm}>
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.mapBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenMapContainer: { flex: 1 },
  fullScreenMap: { ...StyleSheet.absoluteFillObject },
  mapTopButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  mapCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mapFindMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mapBottomButtons: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  mapConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});
