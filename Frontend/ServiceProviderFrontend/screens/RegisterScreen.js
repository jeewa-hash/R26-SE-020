import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4004/api/auth`;

const CATEGORIES = [
  "Electrical repairs", "Plumbing", "Furniture repair",
  "Roofing", "Painting", "House cleaning",
  "Post-construction cleaning", "Move-in / move-out cleaning",
  "Sofa, carpet & curtain cleaning", "Grass cutting",
  "Watering", "Landscaping", "Planting",
  "Child care", "Pet care", "Personal assistance"
];

const DISTRICTS = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", 
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", 
  "Mannar", "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya", 
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
];

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [telephone, setTelephone] = useState('');
  const [countryCode, setCountryCode] = useState('+94');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [rawBio, setRawBio] = useState('');
  const [nicImage, setNicImage] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [isBioGenerated, setIsBioGenerated] = useState(false);
  const [isBioEditable, setIsBioEditable] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [location, setLocation] = useState(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [tempLocation, setTempLocation] = useState({
    latitude: 6.9271, // Default to Colombo
    longitude: 79.8612,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [findingLocation, setFindingLocation] = useState(false);

  // Password Validations
  const isLengthValid = password.length >= 4;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordValid = isLengthValid && hasUpperCase && hasLowerCase && hasSymbol;
  
  // Password confirmation check
  const passwordsMatch = password === confirmPassword;
  const showPasswordError = confirmPassword.length > 0 && !passwordsMatch;

  // We don't automatically request location on mount anymore.
  // We do it when they open the map or click "Find Me".

  const openMap = () => {
    if (location) {
      setTempLocation(location);
    }
    setMapVisible(true);
  };

  const closeMap = () => {
    setMapVisible(false);
  };

  const confirmLocation = () => {
    setLocation(tempLocation);
    setMapVisible(false);
  };

  const findMe = async () => {
    setFindingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        return;
      }
      let userLocation = await Location.getCurrentPositionAsync({});
      setTempLocation({
        ...tempLocation,
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not fetch current location');
    } finally {
      setFindingLocation(false);
    }
  };

  const handleMapPress = (e) => {
    setTempLocation({
      ...tempLocation,
      latitude: e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    });
  };

  const pickImageFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setNicImage(result.assets[0]);
    }
  };

  const scanNicFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You've refused to allow this app to access your camera!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setNicImage(result.assets[0]);
    }
  };

  const pickProfileImageFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0]);
    }
  };

  const scanProfileImageFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You've refused to allow this app to access your camera!");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setProfileImage(result.assets[0]);
    }
  };

  const handleGenerateBio = async () => {
    if (!rawBio) {
      Alert.alert('Error', 'Please enter a brief description first.');
      return;
    }
    setGeneratingBio(true);
    try {
      const response = await axios.post(`${API_URL}/generate-bio`, { rawBio });
      setRawBio(response.data.generatedBio);
      setIsBioGenerated(true);
      setIsBioEditable(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate bio. Please try again.');
      console.log('Bio Gen Error:', error.response?.data || error.message);
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !nicNumber || !telephone || !category || !district || !rawBio) {
      Alert.alert('Error', 'Please fill in all text fields, including your skill description');
      return;
    }
    if (!isPasswordValid) {
      Alert.alert('Error', 'Please ensure your password meets all requirements.');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Please select your location on the map');
      return;
    }
    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!nicImage) {
      Alert.alert('Error', 'Please upload or scan a picture of your NIC');
      return;
    }

    setLoading(true);
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('nicNumber', nicNumber);
    formData.append('telephone', `${countryCode} ${telephone}`);
    formData.append('role', 'ServiceProvider');
    formData.append('category', category);
    formData.append('district', district);
    formData.append('rawBio', rawBio);
    formData.append('latitude', location.latitude.toString());
    formData.append('longitude', location.longitude.toString());

    // Append image
    const localUri = nicImage.uri;
    const filename = localUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('nicImage', { uri: localUri, name: filename, type });

    if (profileImage) {
      const pLocalUri = profileImage.uri;
      const pFilename = pLocalUri.split('/').pop();
      const pMatch = /\.(\w+)$/.exec(pFilename);
      const pType = pMatch ? `image/${pMatch[1]}` : `image`;
      formData.append('profileImage', { uri: pLocalUri, name: pFilename, type: pType });
    }

    try {
      const response = await axios.post(`${API_URL}/register`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Registered successfully! Please wait for admin approval to login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed';
      console.log('Registration Error:', msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Provider Account</Text>

        <View style={styles.profileImageContainer}>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              "Profile Picture",
              "Choose an option",
              [
                { text: "Camera", onPress: scanProfileImageFromCamera },
                { text: "Gallery", onPress: pickProfileImageFromGallery },
                { text: "Cancel", style: "cancel" }
              ]
            );
          }}>
            {profileImage ? (
              <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialIcons name="person" size={50} color="#ccc" />
                <Text style={styles.profileImageText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="NIC Number" value={nicNumber} onChangeText={setNicNumber} />

      <Text style={styles.label}>Brief Description of Your Skills</Text>
      {isBioEditable ? (
        <TextInput 
          style={[styles.input, { height: 160, textAlignVertical: 'top', marginBottom: 10 }]} 
          placeholder="E.g., I am a good carpenter, 5 years work in Colombo" 
          multiline
          numberOfLines={6}
          value={rawBio} 
          onChangeText={setRawBio} 
        />
      ) : (
        <ScrollView style={[styles.input, { height: 160, marginBottom: 10, backgroundColor: '#e9ecef' }]}>
          <Text style={{ color: '#555', fontSize: 14 }}>{rawBio}</Text>
        </ScrollView>
      )}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
        {isBioGenerated ? (
          <>
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateBio} disabled={generatingBio}>
              {generatingBio ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <MaterialIcons name="autorenew" size={18} color="#fff" style={{ marginRight: 5 }} />
                  <Text style={styles.generateBtnText}>Re-generate</Text>
                </>
              )}
            </TouchableOpacity>
            
            {isBioEditable ? (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsBioEditable(false)}>
                <MaterialIcons name="save" size={18} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.generateBtnText}>Save</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsBioEditable(true)}>
                <MaterialIcons name="edit" size={18} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.generateBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateBio} disabled={generatingBio}>
            {generatingBio ? <ActivityIndicator size="small" color="#fff" /> : (
              <>
                <MaterialIcons name="auto-awesome" size={18} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.generateBtnText}>Generate AI Bio</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.label}>Telephone Number</Text>
      <View style={styles.phoneContainer}>
        <View style={styles.countryCodePicker}>
          <Picker 
            selectedValue={countryCode} 
            onValueChange={(itemValue) => setCountryCode(itemValue)}
          >
            <Picker.Item label="+94 (SL)" value="+94" />
            <Picker.Item label="+1 (US)" value="+1" />
            <Picker.Item label="+44 (UK)" value="+44" />
            <Picker.Item label="+61 (AU)" value="+61" />
            <Picker.Item label="+91 (IN)" value="+91" />
          </Picker>
        </View>
        <TextInput 
          style={styles.phoneInput} 
          placeholder="71 234 5678" 
          keyboardType="phone-pad" 
          value={telephone} 
          onChangeText={setTelephone} 
        />
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={category} onValueChange={(itemValue) => setCategory(itemValue)}>
          {CATEGORIES.map((cat, idx) => <Picker.Item key={idx} label={cat} value={cat} />)}
        </Picker>
      </View>

      <Text style={styles.label}>District</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={district} onValueChange={(itemValue) => setDistrict(itemValue)}>
          {DISTRICTS.map((dist, idx) => <Picker.Item key={idx} label={dist} value={dist} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Location</Text>
      <View style={styles.locationContainer}>
        {location ? (
          <Text style={styles.locationText}>
            Selected Code: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.noLocationText}>No location selected</Text>
        )}
        <TouchableOpacity style={styles.openMapBtn} onPress={openMap}>
          <MaterialIcons name="map" size={16} color="#fff" />
          <Text style={styles.openMapBtnText}>Open Map</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={mapVisible} animationType="slide">
        <View style={styles.fullScreenMapContainer}>
          <MapView 
            style={styles.fullScreenMap} 
            region={tempLocation}
            onPress={handleMapPress}
          >
            <Marker coordinate={{ latitude: tempLocation.latitude, longitude: tempLocation.longitude }} />
          </MapView>
          
          <View style={styles.mapTopButtons}>
            <TouchableOpacity style={styles.mapCancelBtn} onPress={closeMap}>
              <MaterialIcons name="close" size={20} color="#fff" />
              <Text style={styles.mapBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.mapFindMeBtn} onPress={findMe} disabled={findingLocation}>
              <MaterialIcons name="my-location" size={20} color="#fff" />
              <Text style={styles.mapBtnText}>{findingLocation ? "Locating..." : "Find Me"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mapBottomButtons}>
            <TouchableOpacity style={styles.mapConfirmBtn} onPress={confirmLocation}>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.mapBtnText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.label}>Password</Text>
      <View style={[styles.passwordContainer, password.length > 0 && !isPasswordValid && styles.inputError]}>
        <TextInput 
          style={styles.passwordInput} 
          placeholder="Password" 
          secureTextEntry={!showPassword} 
          value={password} 
          onChangeText={setPassword} 
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowPassword(!showPassword)}
        >
          <MaterialIcons 
            name={showPassword ? 'visibility' : 'visibility-off'} 
            size={24} 
            color="#777" 
          />
        </TouchableOpacity>
      </View>

      {password.length > 0 && !isPasswordValid && (
        <View style={styles.validationBox}>
          <Text style={!isLengthValid ? styles.errorText : styles.successText}>
            {isLengthValid ? '✓' : '✗'} Minimum 4 characters
          </Text>
          <Text style={!hasUpperCase ? styles.errorText : styles.successText}>
            {hasUpperCase ? '✓' : '✗'} At least 1 uppercase letter
          </Text>
          <Text style={!hasLowerCase ? styles.errorText : styles.successText}>
            {hasLowerCase ? '✓' : '✗'} At least 1 lowercase letter
          </Text>
          <Text style={!hasSymbol ? styles.errorText : styles.successText}>
            {hasSymbol ? '✓' : '✗'} At least 1 symbol
          </Text>
        </View>
      )}

      <View style={[styles.passwordContainer, showPasswordError && styles.inputError]}>
        <TextInput 
          style={styles.passwordInput} 
          placeholder="Confirm Password" 
          secureTextEntry={!showConfirmPassword} 
          value={confirmPassword} 
          onChangeText={setConfirmPassword} 
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <MaterialIcons 
            name={showConfirmPassword ? 'visibility' : 'visibility-off'} 
            size={24} 
            color="#777" 
          />
        </TouchableOpacity>
      </View>
      {showPasswordError && <Text style={styles.errorTextAlone}>Passwords do not match!</Text>}

      <Text style={styles.label}>NIC Image Upload</Text>
      <View style={styles.imageActionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={scanNicFromCamera}>
          <MaterialIcons name="photo-camera" size={24} color="#555" />
          <Text style={styles.actionButtonText}>Scan NIC</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={pickImageFromGallery}>
          <MaterialIcons name="photo-library" size={24} color="#555" />
          <Text style={styles.actionButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      
      {nicImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: nicImage.uri }} style={styles.previewImage} />
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading || showPasswordError || (password.length > 0 && !isPasswordValid)}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Login Here</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  profileImageContainer: { alignItems: 'center', marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#007bff' },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  profileImageText: { color: '#999', fontSize: 12, marginTop: 5 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  locationContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationText: { fontSize: 14, color: '#333', fontWeight: 'bold', flex: 1 },
  noLocationText: { fontSize: 14, color: '#999', fontStyle: 'italic', flex: 1 },
  openMapBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007bff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  openMapBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  
  fullScreenMapContainer: { flex: 1 },
  fullScreenMap: { ...StyleSheet.absoluteFillObject },
  mapTopButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, position: 'absolute', top: 0, width: '100%' },
  mapCancelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 59, 48, 0.9)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  mapFindMeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 123, 255, 0.9)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  mapBottomButtons: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  mapConfirmBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(40, 167, 69, 0.9)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  mapBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 16 },

  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  generateBtn: { backgroundColor: '#6f42c1', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row' },
  editBtn: { backgroundColor: '#28a745', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row' },
  generateBtnText: { color: '#fff', fontWeight: 'bold' },
  phoneContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, height: 50 },
  countryCodePicker: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 10, justifyContent: 'center' },
  phoneInput: { flex: 2, backgroundColor: '#fff', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: '100%' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  passwordInput: { flex: 1, padding: 15 },
  eyeIcon: { padding: 15 },
  inputError: { borderColor: 'red', borderWidth: 2 },
  validationBox: { marginBottom: 15, marginTop: -10, paddingHorizontal: 5 },
  errorText: { color: 'red', fontSize: 12, marginBottom: 2 },
  successText: { color: 'green', fontSize: 12, marginBottom: 2 },
  errorTextAlone: { color: 'red', fontSize: 12, marginTop: -10, marginBottom: 15, marginLeft: 5 },
  pickerContainer: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, overflow: 'hidden' },
  imageActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  actionButton: { flex: 1, backgroundColor: '#eee', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', marginHorizontal: 5, flexDirection: 'row', justifyContent: 'center' },
  actionButtonText: { color: '#555', fontWeight: 'bold', marginLeft: 8 },
  imagePreviewContainer: { alignItems: 'center', marginBottom: 15 },
  previewImage: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  button: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  footerText: { color: '#666' },
  link: { color: '#28a745', fontWeight: 'bold' }
});
