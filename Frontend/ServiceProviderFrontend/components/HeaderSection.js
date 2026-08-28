import React, { useContext, useState } from 'react';
import { 
  View, TouchableOpacity, StyleSheet, Platform, Image, Dimensions,
} from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import ProfileHeader from '../navigation/ProfileHeader'; // Import ProfileHeader

const { width, height } = Dimensions.get('window');

export default function HeaderSection({
  navigation,
  userName = 'Kasun',
  avatarUrl = null,
  search = '',
  onSearchChange = () => {},
  unreadCount = 0,
  onInboxPress = () => {},
  onMenuPress,
}) {
  const theme = useContext(ThemeContext) || {};
  const isDark = theme.isDark ?? false;
  
  // State for ProfileHeader sidebar
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    // Open ProfileHeader sidebar
    setIsSidebarVisible(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarVisible(false);
  };

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
        ]}
      >
        {/* Top Bar: Profile Picture, Actions (Chat & Side Menu) */}
        <View style={styles.topRow}>
          <View style={styles.userSection}>
            <TouchableOpacity style={styles.avatarTouchable} activeOpacity={0.8}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{getInitials(userName)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.userTextContainer}>
              <Text style={[styles.greetingText, { color: isDark ? '#98989D' : '#6B7280' }]}>
                Hello 👋
              </Text>
              <Text style={[styles.userNameText, { color: isDark ? '#F2F2F7' : '#1F2937' }]}>
                {userName}
              </Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            {/* Inbox / Chat Button */}
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
              ]}
              onPress={onInboxPress}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chat-bubble-outline"
                size={22}
                color={isDark ? '#F2F2F7' : '#1F2937'}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Sidebar Menu Toggle Icon - Now opens ProfileHeader sidebar */}
            <TouchableOpacity
              style={[
                styles.menuBtn,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7',
                  borderColor: isDark ? '#3A3A3C' : '#EBEBEB',
                },
              ]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <View style={styles.burgerLines}>
                <View
                  style={[
                    styles.burgerLine,
                    { backgroundColor: isDark ? '#F2F2F7' : '#111111' },
                  ]}
                />
                <View
                  style={[
                    styles.burgerLine,
                    { width: 14, backgroundColor: isDark ? '#F2F2F7' : '#111111' },
                  ]}
                />
                <View
                  style={[
                    styles.burgerLine,
                    { backgroundColor: isDark ? '#F2F2F7' : '#111111' },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Integrated Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search services, categories..."
            placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
            value={search}
            onChangeText={onSearchChange}
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F9FAFB',
                borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
              },
            ]}
            inputStyle={[
              styles.searchInput,
              { color: isDark ? '#F2F2F7' : '#111111' },
            ]}
            iconColor={isDark ? '#8E8E93' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* ProfileHeader Sidebar - Rendered as overlay */}
      {isSidebarVisible && (
        <View style={StyleSheet.absoluteFillObject}>
          <ProfileHeader 
            navigation={navigation}
            onLogout={() => {
              handleCloseSidebar();
              // Add logout logic here if needed
            }}
            // Pass additional props to control sidebar visibility
            externalVisible={isSidebarVisible}
            onClose={handleCloseSidebar}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarTouchable: {
    borderRadius: 22,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userTextContainer: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burgerLines: {
    width: 18,
    height: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  burgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  searchContainer: {
    marginTop: 4,
  },
  searchBar: {
    borderRadius: 14,
    elevation: 0,
    borderWidth: 1,
    height: 46,
  },
  searchInput: {
    fontSize: 14,
    alignSelf: 'center',
    minHeight: 0,
  },
});