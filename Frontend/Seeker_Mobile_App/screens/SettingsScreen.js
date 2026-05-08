// screens/SettingsScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Platform, StatusBar, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { ThemeContext } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { isDarkMode, toggleTheme, setTheme } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [language, setLanguage] = useState('English');

  const handleThemeToggle = async (value) => {
    setTheme(value);
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear app cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          },
          style: 'destructive' 
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            navigation.replace('Login');
          },
          style: 'destructive' 
        }
      ]
    );
  };

  const settingsOptions = [
    { 
      id: 'account', 
      title: 'Account Settings', 
      icon: 'person', 
      color: '#667eea',
      onPress: () => navigation.navigate('ProfileScreen')
    },
    { 
      id: 'privacy', 
      title: 'Privacy & Security', 
      icon: 'lock-closed', 
      color: '#4ECDC4',
      onPress: () => Alert.alert('Privacy', 'Privacy settings coming soon')
    },
    { 
      id: 'language', 
      title: 'Language', 
      icon: 'language', 
      color: '#45B7D1', 
      value: language,
      onPress: () => navigation.navigate('Language')
    },
    { 
      id: 'notifications', 
      title: 'Push Notifications', 
      icon: 'notifications', 
      color: '#96CEB4', 
      isSwitch: true, 
      value: notifications, 
      setter: setNotifications 
    },
    { 
      id: 'email', 
      title: 'Email Updates', 
      icon: 'mail', 
      color: '#FF6B6B', 
      isSwitch: true, 
      value: emailUpdates, 
      setter: setEmailUpdates 
    },
    { 
      id: 'darkmode', 
      title: 'Dark Mode', 
      icon: isDarkMode ? 'moon' : 'sunny', 
      color: '#6B7280', 
      isSwitch: true, 
      value: isDarkMode, 
      setter: handleThemeToggle,
      description: 'Switch between light and dark theme'
    },
  ];

  const accountOptions = [
    { id: 'help', title: 'Help Center', icon: 'help-circle', color: '#667eea' },
    { id: 'about', title: 'About Us', icon: 'information-circle', color: '#4ECDC4' },
    { id: 'terms', title: 'Terms & Conditions', icon: 'document-text', color: '#45B7D1' },
  ];

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Summary */}
        <TouchableOpacity 
          style={[styles.profileSummary, isDarkMode && styles.profileSummaryDark]} 
          onPress={() => navigation.navigate('ProfileScreen')}
        >
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=7' }} style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, isDarkMode && styles.textDark]}>Tashmi Perera</Text>
            <Text style={[styles.profileEmail, isDarkMode && styles.textMutedDark]}>tashmi@example.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9CA3AF" : "#9CA3AF"} />
        </TouchableOpacity>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Preferences</Text>
          <View style={[styles.settingsCard, isDarkMode && styles.settingsCardDark]}>
            {settingsOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.settingItem, 
                  index !== 0 && [styles.borderTop, isDarkMode && styles.borderTopDark],
                  isDarkMode && styles.settingItemDark
                ]}
                onPress={() => !option.isSwitch && option.onPress()}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: `${option.color}15` }]}>
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <View>
                    <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>{option.title}</Text>
                    {option.description && (
                      <Text style={[styles.settingDescription, isDarkMode && styles.textMutedDark]}>{option.description}</Text>
                    )}
                  </View>
                </View>
                {option.isSwitch ? (
                  <Switch
                    value={option.value}
                    onValueChange={option.setter}
                    trackColor={{ false: '#E5E7EB', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                ) : option.value ? (
                  <View style={styles.settingValue}>
                    <Text style={[styles.settingValueText, isDarkMode && styles.textMutedDark]}>{option.value}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Account</Text>
          <View style={[styles.settingsCard, isDarkMode && styles.settingsCardDark]}>
            {accountOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.settingItem, 
                  index !== 0 && [styles.borderTop, isDarkMode && styles.borderTopDark],
                  isDarkMode && styles.settingItemDark
                ]}
                onPress={() => Alert.alert(option.title, `${option.title} section coming soon`)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: `${option.color}15` }]}>
                    <Ionicons name={option.icon} size={20} color={option.color} />
                  </View>
                  <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>{option.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Data Management</Text>
          <View style={[styles.settingsCard, isDarkMode && styles.settingsCardDark]}>
            <TouchableOpacity 
              style={[styles.settingItem, isDarkMode && styles.settingItemDark]} 
              onPress={handleClearCache}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </View>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>Clear Cache</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.settingItem, 
                styles.borderTop, 
                isDarkMode && styles.borderTopDark,
                isDarkMode && styles.settingItemDark
              ]} 
              onPress={() => Alert.alert('Export Data', 'Export your data feature coming soon')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: '#10B98115' }]}>
                  <Ionicons name="download-outline" size={20} color="#10B981" />
                </View>
                <Text style={[styles.settingTitle, isDarkMode && styles.textDark]}>Export Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.versionText, isDarkMode && styles.textMutedDark]}>Version 2.0.0</Text>
          <Text style={[styles.copyrightText, isDarkMode && styles.textMutedDark]}>© 2024 ServiceHub. All rights reserved.</Text>
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  profileSummaryDark: {
    backgroundColor: '#16213e',
  },
  profileAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsCardDark: {
    backgroundColor: '#16213e',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingItemDark: {
    backgroundColor: '#16213e',
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  borderTopDark: {
    borderTopColor: '#2d3561',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValueText: {
    fontSize: 14,
    color: '#6B7280',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: '#D1D5DB',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});