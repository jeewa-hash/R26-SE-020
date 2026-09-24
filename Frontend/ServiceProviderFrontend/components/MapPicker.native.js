import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export default function MapPicker({ style, region, onPress }) {
  return (
    <MapView style={style} region={region} onPress={onPress}>
      <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
    </MapView>
  );
}
