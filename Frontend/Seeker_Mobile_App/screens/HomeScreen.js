import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;

export default function HomeScreen({ navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.log('Error fetching seeker notifications count:', err);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.bellContainer} 
          onPress={() => navigation.navigate('Notifications')}
        >
          <MaterialIcons name="notifications-none" size={28} color="#333" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, unreadCount]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{t('good_morning')}</Text>
              <Text style={styles.userName}>Tashmi 👋</Text>
              <Text style={styles.subGreeting}>{t('what_help_today')}</Text>
            </View>
            <View style={styles.headerActions}>
              {/* Chat Icon */}
              <TouchableOpacity style={styles.chatBtn} onPress={handleChatPress}>
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>2</Text>
                </View>
                <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Notification Icon */}
              <TouchableOpacity style={styles.notificationBtn} onPress={handleNotifications}>
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>3</Text>
                </View>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
              </TouchableOpacity>
              
              {/* Profile Button with Navigation */}
              <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
                <Image source={{ uri: 'https://i.pravatar.cc/150?img=7' }} style={styles.profilePic} />
                <View style={styles.onlineDot} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Search Bar with Filters */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <TouchableOpacity onPress={handleSearch}>
              <MaterialIcons name="search" size={22} color="#667eea" />
            </TouchableOpacity>
            <TextInput 
              placeholder={t('search_placeholder')}
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#999" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterIcon}>
              <MaterialIcons name="tune" size={22} color="#667eea" />
            </TouchableOpacity>
          </View>
          
          {/* Filter Chips */}
          {showFilters && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_nearby')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_top_rated')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_lowest_price')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_available_now')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_support_24_7')}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Action Buttons Row - 3 buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleStartBidding}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <MaterialIcons name="gavel" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('bidding')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCreatePost}>
            <LinearGradient
              colors={['#4ECDC4', '#44B3A5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <MaterialIcons name="post-add" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('create_post')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleGoToFeed}>
            <LinearGradient
              colors={['#96CEB4', '#45B7D1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <MaterialIcons name="feed" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('feed')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('all_services')}</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>{t('home_see_all')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Expandable Service List */}
        {CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.accordionContainer}>
            <TouchableOpacity 
              style={styles.mainCategory} 
              onPress={() => toggleExpand(cat.id)}
              activeOpacity={0.7}
            >
              <View style={styles.mainCategoryLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${cat.color}15` }]}>
                  <MaterialIcons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={styles.mainTitle}>{cat.title}</Text>
              </View>
              <View style={[styles.expandIcon, expandedId === cat.id && styles.expandIconActive]}>
                <MaterialIcons 
                  name={expandedId === cat.id ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#667eea" 
                />
              </View>
            </TouchableOpacity>

            {/* Sub-categories Grid */}
            {expandedId === cat.id && (
              <View style={styles.subGrid}>
                {cat.subcategories.map((sub, index) => (
                  <TouchableOpacity key={index} style={styles.subThumbnail}>
                    <View style={styles.subIcon}>
                      <MaterialIcons name="check-circle" size={16} color={cat.color} />
                    </View>
                    <Text style={styles.subText}>{sub}</Text>
                  </TouchableOpacity>
                ))}

                {cat.id === 1 && (
                  <TouchableOpacity style={styles.specialUploadBtn} activeOpacity={0.8} onPress={handleImageUpload}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      <MaterialIcons name="camera-alt" size={20} color="#fff" />
                      <Text style={styles.uploadText}>{t('home_upload_repair_photo')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>{t('home_special_offer')}</Text>
              <Text style={styles.promoText}>{t('home_first_service_discount')}</Text>
              <TouchableOpacity style={styles.promoBtn}>
                <Text style={styles.promoBtnText}>{t('home_book_now')}</Text>
              </TouchableOpacity>
            </View>
            <MaterialIcons name="local-offer" size={60} color="#ffffff30" style={styles.promoIcon} />
          </LinearGradient>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20, 
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10, 
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold'
  },
  bellContainer: {
    marginRight: 15,
    position: 'relative',
    padding: 5,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
