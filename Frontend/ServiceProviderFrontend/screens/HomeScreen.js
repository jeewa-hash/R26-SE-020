import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, Switch } from 'react-native-paper';
import { Colors } from '../theme';

const languages = [
  { id: 'en', label: 'English', native: 'English', icon: '🌐' },
  { id: 'si', label: 'Sinhala', native: 'සිංහල', icon: '🌐' },
];

export default function HomeScreen({ navigation }) {
  const [selectedLang, setSelectedLang] = useState('en');
  const [skipTutorial, setSkipTutorial] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 60 }}
        showsVerticalScrollIndicator={false}
      >

        {/* Header Icons */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}>
          {/* Logo */}
          <View style={{
            width: 44,
            height: 44,
            backgroundColor: '#000',
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ color: '#fff', fontSize: 20 }}>⚡</Text>
          </View>

          {/* Help */}
          <View style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: '#E0E0E0',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 18 }}>?</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#111',
          marginBottom: 8,
        }}>
          Welcome to LocalPro
        </Text>
        <Text style={{
          fontSize: 15,
          color: '#666',
          marginBottom: 32,
          lineHeight: 22,
        }}>
          Please select your preferred language to continue.
        </Text>

        {/* Language Cards */}
        {languages.map((lang) => {
          const isSelected = selectedLang === lang.id;
          return (
            <TouchableOpacity
              key={lang.id}
              onPress={() => setSelectedLang(lang.id)}
              style={{
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? Colors.primary : '#E0E0E0',
                borderRadius: 14,
                padding: 20,
                marginBottom: 14,
                backgroundColor: isSelected ? '#EEF0FF' : '#FAFAFA',
                alignItems: 'center',
              }}
            >
              {/* Checkmark */}
              {isSelected && (
                <View style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: Colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>
                </View>
              )}

              {/* Language Icon */}
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: isSelected ? Colors.primary : '#E0E0E0',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <Text style={{ fontSize: 22 }}>🌐</Text>
              </View>

              {/* Language Name */}
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#111',
                marginBottom: 2,
              }}>
                {lang.native}
              </Text>
              <Text style={{ fontSize: 13, color: '#888' }}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Info Note */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#EEF4FF',
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <Text style={{ fontSize: 16, color: Colors.primary }}>ℹ️</Text>
          <Text style={{ flex: 1, fontSize: 13, color: '#444', lineHeight: 20 }}>
            You can change your language settings at any time in the profile section after setup.
          </Text>
        </View>

        {/* Skip Tutorial Toggle */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#E0E0E0',
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
        }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111' }}>
              Skip Tutorial
            </Text>
            <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              I already know how to use LocalPro
            </Text>
          </View>
          <Switch
            value={skipTutorial}
            onValueChange={setSkipTutorial}
            color={Colors.primary}
          />
        </View>

      </ScrollView>

      {/* Continue Button - Fixed at Bottom */}
      <View style={{ padding: 24, paddingBottom: 36 }}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          contentStyle={{ height: 52 }}
          style={{ borderRadius: 14 }}
          labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
          icon="chevron-right"
        >
          Continue
        </Button>
      </View>

    </View>
  );
}