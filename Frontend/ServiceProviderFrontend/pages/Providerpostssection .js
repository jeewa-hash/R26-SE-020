/**
 * pages/Providerpostssection .js
 *
 * Displays the provider's posted ads with modern UI, like counts,
 * liker names, boost priority via Stripe Checkout, an "All Posts"
 * view that displays ONLY the post headers in a compact, searchable,
 * and filterable list, AND full post details view when clicking any post.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../theme';
import { CONFIG, IP_ADDRESS } from '../config';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W * 0.82, 330);

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatCount(n) {
  if (typeof n !== 'number') return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Carousel Full Post Card ──────────────────────────────────────

function PostCard({ post, onLike, onOptions, onBoost, onOpenDetail, isDark, C, isBoosting, t }) {
  const isBoosted = (post.priority || 0) > 0;
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: C.card,
          borderColor: isBoosted ? (isDark ? '#854D0E' : '#FDE68A') : C.border,
          shadowColor: isDark ? '#000' : '#10B981',
        },
      ]}
    >
      {/* Card Header — Time, Boost badge, Options */}
      <View style={styles.cardHeader}>
        <View style={styles.timeRow}>
          <View style={[styles.timeCapsule, { backgroundColor: isDark ? '#232D26' : '#F1F5F2' }]}>
            <MaterialIcons name="access-time" size={11} color={C.textSub} />
            <Text style={[styles.timeText, { color: C.textSub }]}>
              {timeAgo(post.postedAt)}
            </Text>
          </View>
          {isBoosted && (
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.boostBadge}
            >
              <MaterialCommunityIcons name="rocket-launch" size={10} color="#fff" />
              <Text style={styles.boostBadgeText}>
                {t('boosted') || 'Boosted'} Lv.{post.priority}
              </Text>
            </LinearGradient>
          )}
        </View>

        <TouchableOpacity
          onPress={() => onOptions(post)}
          hitSlop={10}
          style={[styles.iconButton, { backgroundColor: isDark ? '#232D26' : '#F4F7F4' }]}
        >
          <MaterialIcons name="more-vert" size={18} color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* Post Image with tap-to-view */}
      <TouchableOpacity
        style={styles.imageContainer}
        activeOpacity={0.9}
        onPress={() => onOpenDetail(post)}
      >
        {post.image ? (
          <Image
            source={{ uri: post.image }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: isDark ? '#1A231C' : '#F0FDF4' },
            ]}
          >
            <View style={styles.placeholderIconRing}>
              <MaterialIcons name="campaign" size={28} color={Colors.primary} />
            </View>
            <Text style={[styles.placeholderText, { color: Colors.primary }]}>
              Service Advertisement
            </Text>
          </View>
        )}
        <View style={styles.categoryChip}>
          <Text style={styles.categoryChipText}>Featured Ad</Text>
        </View>
      </TouchableOpacity>

      {/* Post Content */}
      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => onOpenDetail(post)}
        activeOpacity={0.88}
      >
        <Text style={[styles.postTitle, { color: C.text }]} numberOfLines={expanded ? undefined : 2}>
          {post.title}
        </Text>
        {!!post.description && (
          <Text
            style={[styles.postDesc, { color: C.textSub }]}
            numberOfLines={expanded ? undefined : 3}
          >
            {post.description}
          </Text>
        )}
        <TouchableOpacity
          style={styles.expandRow}
          onPress={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show Less' : 'Read More'}
          </Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={16}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Liked By Names List */}
      {Array.isArray(post.likedBy) && post.likedBy.length > 0 && (
        <View style={[styles.likedByContainer, { backgroundColor: isDark ? '#1C251F' : '#F7FAF8' }]}>
          <View style={styles.likedByHeaderRow}>
            <MaterialCommunityIcons name="heart" size={13} color="#EF4444" />
            <Text style={[styles.likedByHeader, { color: C.textSub }]}>
              {t('likedBy') || 'Liked by'}:
            </Text>
          </View>
          <Text style={[styles.likedByNames, { color: C.text }]} numberOfLines={2}>
            {post.likedBy.join(', ')}
          </Text>
        </View>
      )}

      {/* Bottom Action Bar: Like Button & Boost Button */}
      <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[
            styles.likeBtn,
            { backgroundColor: post.isLiked ? '#FEE2E2' : (isDark ? '#232D26' : '#F1F5F2') },
          ]}
          onPress={() => onLike(post.id)}
          activeOpacity={0.75}
        >
          <MaterialCommunityIcons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={post.isLiked ? '#EF4444' : C.textSub}
          />
          <Text style={[styles.likeCountText, { color: post.isLiked ? '#EF4444' : C.text }]}>
            {formatCount(post.likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.boostBtnWrapper}
          onPress={() => onBoost(post)}
          activeOpacity={0.85}
          disabled={isBoosting}
        >
          <LinearGradient
            colors={isBoosted ? ['#F59E0B', '#D97706'] : [Colors.primary, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.boostGradientBtn}
          >
            {isBoosting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={isBoosted ? 'rocket-launch' : 'trending-up'}
                  size={15}
                  color="#fff"
                />
                <Text style={styles.boostBtnText}>
                  {isBoosted
                    ? (t('boostAgain') || 'Boost Again')
                    : (t('boostAd') || 'Boost Ad')}
                </Text>
                {isBoosted && (
                  <View style={styles.boostCounterPill}>
                    <Text style={styles.boostCounterText}>+{post.priority}</Text>
                  </View>
                )}
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Compact Post Header Card (For "All Posts" View) ───────────────

function PostHeaderCard({ post, onOptions, onBoost, isDark, C, isBoosting, onPress, t }) {
  const isBoosted = (post.priority || 0) > 0;

  return (
    <TouchableOpacity
      style={[
        styles.headerCard,
        {
          backgroundColor: C.card,
          borderColor: isBoosted ? (isDark ? '#78350F' : '#FDE68A') : C.border,
        },
      ]}
      activeOpacity={0.82}
      onPress={onPress}
    >
      {/* Thumbnail */}
      <View style={styles.headerThumbContainer}>
        {post.image ? (
          <Image source={{ uri: post.image }} style={styles.headerThumb} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.headerThumbPlaceholder,
              { backgroundColor: isDark ? '#1E2821' : '#EDF7EE' },
            ]}
          >
            <MaterialIcons name="campaign" size={22} color={Colors.primary} />
          </View>
        )}
        {isBoosted && (
          <View style={styles.headerThumbBoostBadge}>
            <MaterialCommunityIcons name="rocket-launch" size={9} color="#fff" />
          </View>
        )}
      </View>

      {/* Main Info Header: Title, Post date, Likes, Boost badge */}
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
          {post.title}
        </Text>

        <View style={styles.headerMetaRow}>
          {/* Post Date */}
          <View style={styles.headerMetaPill}>
            <MaterialIcons name="access-time" size={11} color={C.textSub} />
            <Text style={[styles.headerMetaText, { color: C.textSub }]}>
              {timeAgo(post.postedAt)}
            </Text>
          </View>

          {/* Likes */}
          <View style={styles.headerMetaPill}>
            <MaterialCommunityIcons name="heart" size={11} color="#EF4444" />
            <Text style={[styles.headerMetaText, { color: C.textSub }]}>
              {formatCount(post.likes)}
            </Text>
          </View>

          {/* Boost Pill */}
          {isBoosted ? (
            <View style={styles.headerBoostPill}>
              <Text style={styles.headerBoostPillText}>Lv.{post.priority}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right Quick Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[
            styles.headerQuickBoostBtn,
            { backgroundColor: isBoosted ? '#F59E0B' : (isDark ? '#233226' : '#E8F5E9') },
          ]}
          onPress={() => onBoost(post)}
          activeOpacity={0.8}
          disabled={isBoosting}
        >
          {isBoosting ? (
            <ActivityIndicator size="small" color={isBoosted ? '#fff' : Colors.primary} />
          ) : (
            <MaterialCommunityIcons
              name="rocket-launch"
              size={14}
              color={isBoosted ? '#fff' : Colors.primary}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.headerMenuBtn, { backgroundColor: isDark ? '#232D26' : '#F4F7F4' }]}
          onPress={() => onOptions(post)}
          hitSlop={8}
        >
          <MaterialIcons name="more-vert" size={18} color={C.textSub} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Full Post Detail Modal ────────────────────────────────────────

function PostDetailModal({ visible, post, onClose, onEdit, onDelete, onBoost, onLike, isDark, C, isBoosting, t }) {
  if (!post) return null;
  const isBoosted = (post.priority || 0) > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.detailModalContainer, { backgroundColor: isDark ? '#0C0F0D' : '#F6F9F7' }]}>
        {/* Detail Header */}
        <View style={[styles.detailHeader, { backgroundColor: isDark ? '#161C18' : '#FFFFFF', borderBottomColor: C.border }]}>
          <TouchableOpacity style={[styles.detailBackBtn, { backgroundColor: isDark ? '#232D26' : '#F1F5F2' }]} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.detailHeaderTitle, { color: C.text }]}>Ad Details</Text>
          <TouchableOpacity
            style={[styles.detailEditBtn, { backgroundColor: isDark ? '#233226' : '#DCFCE7' }]}
            onPress={() => onEdit(post)}
          >
            <MaterialIcons name="edit" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Image */}
          <View style={styles.detailHeroImageWrapper}>
            {post.image ? (
              <Image source={{ uri: post.image }} style={styles.detailHeroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.detailHeroPlaceholder, { backgroundColor: isDark ? '#1A231C' : '#E8F5E9' }]}>
                <MaterialIcons name="campaign" size={48} color={Colors.primary} />
                <Text style={{ color: Colors.primary, fontWeight: '700', marginTop: 8 }}>Service Advertisement</Text>
              </View>
            )}

            {/* Time Capsule Floating */}
            <View style={styles.detailHeroTimePill}>
              <MaterialIcons name="access-time" size={12} color="#FFFFFF" />
              <Text style={styles.detailHeroTimeText}>{timeAgo(post.postedAt)}</Text>
            </View>

            {/* Boost Badge Floating */}
            {isBoosted && (
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.detailHeroBoostBadge}>
                <MaterialCommunityIcons name="rocket-launch" size={12} color="#FFFFFF" />
                <Text style={styles.detailHeroBoostText}>Priority Lv.{post.priority}</Text>
              </LinearGradient>
            )}
          </View>

          {/* Title and Category */}
          <View style={[styles.detailCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.detailTitleRow}>
              <Text style={[styles.detailTitle, { color: C.text }]}>{post.title}</Text>
            </View>

            <View style={styles.detailMetaPillsRow}>
              <TouchableOpacity
                style={[styles.detailStatPill, { backgroundColor: post.isLiked ? '#FEE2E2' : (isDark ? '#232D26' : '#F1F5F2') }]}
                onPress={() => onLike(post.id)}
              >
                <MaterialCommunityIcons name={post.isLiked ? 'heart' : 'heart-outline'} size={16} color={post.isLiked ? '#EF4444' : C.textSub} />
                <Text style={[styles.detailStatText, { color: post.isLiked ? '#EF4444' : C.text }]}>
                  {formatCount(post.likes)} Likes
                </Text>
              </TouchableOpacity>

              <View style={[styles.detailStatPill, { backgroundColor: isDark ? '#232D26' : '#F1F5F2' }]}>
                <MaterialCommunityIcons name="rocket-launch" size={16} color={isBoosted ? '#F59E0B' : Colors.primary} />
                <Text style={[styles.detailStatText, { color: C.text }]}>
                  Priority Lv.{post.priority}
                </Text>
              </View>

              {post.language && (
                <View style={[styles.detailStatPill, { backgroundColor: isDark ? '#232D26' : '#F1F5F2' }]}>
                  <MaterialIcons name="translate" size={15} color={Colors.primary} />
                  <Text style={[styles.detailStatText, { color: C.text }]}>
                    {post.language.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description & Content Card */}
          <View style={[styles.detailCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.detailSectionHeaderRow}>
              <MaterialIcons name="description" size={18} color={Colors.primary} />
              <Text style={[styles.detailSectionTitle, { color: C.text }]}>Description & Caption</Text>
            </View>

            <Text style={[styles.detailDescText, { color: C.text }]}>
              {post.description || 'No description provided for this advertisement.'}
            </Text>

            {/* Tags */}
            {Array.isArray(post.tags) && post.tags.length > 0 && (
              <View style={styles.detailTagsContainer}>
                {post.tags.map((tag, idx) => (
                  <View key={idx} style={[styles.detailTagChip, { backgroundColor: isDark ? '#233226' : '#E8F5E9' }]}>
                    <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '700' }}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Liked By List */}
          {Array.isArray(post.likedBy) && post.likedBy.length > 0 && (
            <View style={[styles.detailCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.detailSectionHeaderRow}>
                <MaterialCommunityIcons name="heart" size={18} color="#EF4444" />
                <Text style={[styles.detailSectionTitle, { color: C.text }]}>
                  Seekers Who Liked This Ad ({post.likedBy.length})
                </Text>
              </View>

              <View style={styles.likedByNamesList}>
                {post.likedBy.map((name, i) => (
                  <View key={i} style={[styles.likerItem, { backgroundColor: isDark ? '#1C251F' : '#F8FAF9' }]}>
                    <View style={styles.likerAvatar}>
                      <Text style={styles.likerAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.likerName, { color: C.text }]}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.detailActionsContainer}>
            <TouchableOpacity
              style={styles.detailBoostBtn}
              onPress={() => onBoost(post)}
              disabled={isBoosting}
            >
              <LinearGradient
                colors={isBoosted ? ['#F59E0B', '#D97706'] : [Colors.primary, '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailBoostGradient}
              >
                {isBoosting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="rocket-launch" size={18} color="#fff" />
                    <Text style={styles.detailBoostBtnText}>
                      {isBoosted ? `Boost Again (+Lv.${post.priority})` : 'Boost Priority via Stripe'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.detailSubActionsRow}>
              <TouchableOpacity
                style={[styles.detailSubActionBtn, { borderColor: Colors.primary, backgroundColor: isDark ? '#1C2E20' : '#E8F5E9' }]}
                onPress={() => onEdit(post)}
              >
                <MaterialIcons name="edit" size={18} color={Colors.primary} />
                <Text style={[styles.detailSubActionText, { color: Colors.primary }]}>Edit Post</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.detailSubActionBtn, { borderColor: '#EF4444', backgroundColor: isDark ? '#3D1A1A' : '#FEE2E2' }]}
                onPress={() => onDelete(post)}
              >
                <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                <Text style={[styles.detailSubActionText, { color: '#EF4444' }]}>Delete Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Options Bottom Sheet ─────────────────────────────────────────

function OptionsModal({ visible, onClose, onEdit, onDelete, isDark, t }) {
  const bg = isDark ? '#161C18' : '#fff';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.bottomSheet, { backgroundColor: bg }]}>
          <View style={styles.sheetHandle} />

          <TouchableOpacity style={styles.sheetOption} onPress={onEdit} activeOpacity={0.7}>
            <View style={[styles.sheetIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <MaterialIcons name="edit" size={18} color="#15803D" />
            </View>
            <Text style={[styles.sheetOptionText, { color: '#15803D' }]}>
              {t('editPost') || 'Edit Post'}
            </Text>
          </TouchableOpacity>

          <View style={styles.sheetDivider} />

          <TouchableOpacity style={styles.sheetOption} onPress={onDelete} activeOpacity={0.7}>
            <View style={[styles.sheetIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.sheetOptionText, { color: '#EF4444' }]}>
              {t('deletePost') || 'Delete Post'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sheetOption, { marginTop: 6, justifyContent: 'center' }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetOptionText, { color: '#6B7280', fontSize: 14 }]}>
              {t('cancel') || 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Boost Amount Bottom Sheet ─────────────────────────────────────

const PRESET_STEPS = [1, 5, 10, 20];
const BASE_RATE_PER_STEP_LKR = 200;

function calculatePreviewFee(amount) {
  if (!amount || amount <= 0) return 0;
  const rawTotal = amount * BASE_RATE_PER_STEP_LKR;
  const discountTier = Math.floor(amount / 5);
  const discountPercentage = Math.min(discountTier * 0.05, 0.25);
  return Math.round(rawTotal - rawTotal * discountPercentage);
}

function BoostModal({ visible, onClose, onConfirm, isDark, isSubmitting }) {
  const [customValue, setCustomValue] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [selected, setSelected] = useState(1);
  const [error, setError] = useState('');

  const bg = isDark ? '#161C18' : '#fff';
  const textColor = isDark ? '#F2F2F7' : '#111111';
  const subColor = isDark ? '#8E8E93' : '#6B7280';
  const border = isDark ? '#303C33' : '#D8E8DC';

  const activeAmount = isCustom ? Number(customValue) : selected;
  const fee = calculatePreviewFee(activeAmount);

  const validate = (value) => {
    if (value.trim() === '') return 'Enter a boost amount.';
    const num = Number(value);
    if (!Number.isInteger(num)) return 'Must be a whole number.';
    if (num <= 0) return 'Must be greater than 0.';
    if (num > 100) return 'Maximum is 100 steps.';
    return '';
  };

  const handleCustomChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomValue(cleaned);
    setError(validate(cleaned));
  };

  const handlePresetPress = (value) => {
    setIsCustom(false);
    setSelected(value);
    setError('');
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    setError(validate(customValue));
  };

  const handleConfirm = () => {
    const err = validate(String(activeAmount));
    if (err) {
      setError(err);
      return;
    }
    onConfirm(activeAmount);
  };

  const canConfirm = !error && activeAmount > 0 && !isSubmitting;

  useEffect(() => {
    if (!visible) {
      setCustomValue('');
      setIsCustom(false);
      setSelected(1);
      setError('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.bottomSheet, { backgroundColor: bg }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />

          <View style={styles.boostHeaderRow}>
            <View style={styles.boostIconContainer}>
              <MaterialCommunityIcons name="rocket-launch" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.boostTitle, { color: textColor }]}>Boost Priority</Text>
              <Text style={[styles.boostSubtitle, { color: subColor }]}>
                Rank higher in seeker search results
              </Text>
            </View>
          </View>

          <View style={styles.presetRow}>
            {PRESET_STEPS.map((step) => {
              const isActive = !isCustom && selected === step;
              return (
                <TouchableOpacity
                  key={step}
                  style={[
                    styles.presetChip,
                    { borderColor: isActive ? Colors.primary : border },
                    isActive && styles.presetChipActive,
                  ]}
                  onPress={() => handlePresetPress(step)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: isActive ? '#fff' : textColor },
                    ]}
                  >
                    +{step}
                  </Text>
                  {step >= 5 && (
                    <Text
                      style={[
                        styles.presetDiscountText,
                        { color: isActive ? 'rgba(255,255,255,0.85)' : Colors.primary },
                      ]}
                    >
                      {Math.floor(step / 5) * 5}% OFF
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.customBox,
              { borderColor: isCustom ? Colors.primary : border },
            ]}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={18}
              color={isCustom ? Colors.primary : subColor}
            />
            <TextInput
              style={[styles.customInput, { color: textColor }]}
              placeholder="Custom steps amount"
              placeholderTextColor={subColor}
              keyboardType="number-pad"
              value={customValue}
              onFocus={handleCustomFocus}
              onChangeText={handleCustomChange}
              maxLength={3}
            />
          </View>

          {!!error && <Text style={styles.boostErrorText}>{error}</Text>}

          {activeAmount > 0 && !error && (
            <View style={[styles.feePreview, { backgroundColor: isDark ? '#1C251F' : '#F7FAF8' }]}>
              <Text style={[styles.feeLabel, { color: subColor }]}>Estimated charge</Text>
              <Text style={[styles.feeValue, { color: textColor }]}>
                LKR {fee.toLocaleString()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canConfirm ? [Colors.primary, '#059669'] : ['#9CA3AF', '#6B7280']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="lock-check" size={17} color="#fff" />
                  <Text style={styles.confirmBtnText}>Continue to Secure Payment</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sheetOption, { justifyContent: 'center', marginTop: 4 }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetOptionText, { color: '#6B7280', fontSize: 14 }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Section Component ───────────────────────────────────────

export default function ProviderPostsSection({ navigation, isDark }) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedDetailPost, setSelectedDetailPost] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [boostingId, setBoostingId] = useState(null);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostTargetPost, setBoostTargetPost] = useState(null);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [postSort, setPostSort] = useState('recent'); // 'recent' | 'boosted' | 'likes'
  const [searchQuery, setSearchQuery] = useState('');

  // Penalty restriction check state
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyRatio, setPenaltyRatio] = useState('3/3');
  const [checkingPenalty, setCheckingPenalty] = useState(false);

  const C = isDark
    ? { card: '#161C18', text: '#F2F2F7', textSub: '#8E8E93', border: '#303C33' }
    : { card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0' };

  const handleNewPostPress = async () => {
    try {
      setCheckingPenalty(true);
      let userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        const token = (await AsyncStorage.getItem('userToken')) || (await AsyncStorage.getItem('token'));
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
              userId = decoded.id || decoded._id || decoded.userId || decoded.user?.id || decoded.user?._id;
            }
          } catch (_) {}
        }
      }
      if (!userId) {
        userId = '69fc31f3cfe41c4d62e6f9ee';
      }

      const adminUrl = CONFIG.ADMIN_SERVICE_URL || `http://${IP_ADDRESS || '192.168.1.38'}:5001`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      try {
        const res = await fetch(`${adminUrl}/api/inquiries/check-bookable/${userId}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const statusData = await res.json();
          const score = typeof statusData.penaltyScore === 'number' ? statusData.penaltyScore : (statusData.activeMissedBookingsCount || 0);
          if (score >= 3 || statusData.isRestricted || statusData.isBlocked) {
            setPenaltyRatio(statusData.penaltyRatio || `${score}/3`);
            setShowPenaltyModal(true);
            setCheckingPenalty(false);
            return;
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (e) {
      // Admin service optional or offline
    } finally {
      setCheckingPenalty(false);
    }
    navigation.navigate('PostGeneration');
  };

  const fetchLikerNames = async (likeIds) => {
    if (!Array.isArray(likeIds) || likeIds.length === 0) return [];

    const users = await Promise.all(
      likeIds.map(async (id) => {
        try {
          const response = await fetch(
            `${CONFIG.AUTH_SERVICE_URL}/../seeker/user/${id}`
          );
          if (!response.ok) return 'Unknown user';
          const data = await response.json();
          return data.name || data.user?.name || 'Unknown user';
        } catch (error) {
          console.log('Error fetching seeker info:', error);
          return 'Unknown user';
        }
      })
    );

    return users;
  };

  const fetchPosts = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);

      const authToken = await AsyncStorage.getItem('userToken');

      if (!authToken) {
        Alert.alert('Error', 'No authentication token found. Please login again.');
        setLoading(false);
        return;
      }

      const res = await fetch(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/provider`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const data = await res.json();

      if (data && Array.isArray(data.data)) {
        const formattedPosts = await Promise.all(
          data.data.map(async (post) => {
            const platformPost = post.posts?.[0] || {};
            const likeIds = Array.isArray(post.likes) ? post.likes : [];
            const likedBy = await fetchLikerNames(likeIds);

            return {
              id: post._id || post.id,
              title: platformPost.title || post.serviceLabel || 'Service advertisement',
              description: platformPost.caption || post.extraInfo || '',
              image: post.image?.url || post.images?.[0] || null,
              likes: likeIds.length > 0 ? likeIds.length : (typeof post.likes === 'number' ? post.likes : 0),
              likedBy,
              comments: post.comments || 0,
              postedAt: post.createdAt || post.postedAt,
              isLiked: Boolean(post.isLiked),
              priority: post.priority || 0,
              // Preserved fields for detail and editing
              serviceLabel: post.serviceLabel || platformPost.title || 'Service advertisement',
              specificLabel: post.specificLabel || '',
              category: post.category || 'home service',
              tags: post.tags || platformPost.hashtags || [],
              images: post.images || (post.image?.url ? [post.image.url] : []),
              tone: post.tone || 'professional',
              language: post.language || 'en',
              extraInfo: post.extraInfo || '',
            };
          })
        );

        setPosts(formattedPosts);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.log('Fetch posts error:', err);
      Alert.alert(
        'Unable to load posts',
        'Check that the Provider Service is running and reachable via your configuration IP.'
      );
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(true);
  }, [fetchPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts(false);
    }, [fetchPosts])
  );

  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1,
        };
      })
    );

    if (selectedDetailPost && selectedDetailPost.id === postId) {
      setSelectedDetailPost((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
      }));
    }
  };

  const handleOptions = (post) => {
    setSelectedPost(post);
    setShowOptions(true);
  };

  const openDetailModal = (post) => {
    setSelectedDetailPost(post);
    setShowDetailModal(true);
  };

  const handleDelete = async (targetPost = selectedPost) => {
    const postToDelete = targetPost || selectedPost;
    if (!postToDelete) return;

    Alert.alert(
      'Delete Advertisement',
      'Are you sure you want to permanently delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(
                `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/${postToDelete.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
              if (!res.ok) throw new Error(`Server returned ${res.status}`);
              setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
              setShowOptions(false);
              setShowDetailModal(false);
              setSelectedDetailPost(null);
            } catch (err) {
              Alert.alert('Unable to delete post', err.message);
            }
          },
        },
      ]
    );
  };

  const handleEdit = (targetPost = selectedPost) => {
    const postToEdit = targetPost || selectedPost || selectedDetailPost;
    setShowOptions(false);
    setShowDetailModal(false);
    navigation.navigate('PostGeneration', { post: postToEdit, mode: 'edit' });
  };

  const openBoostModal = (post) => {
    setBoostTargetPost(post);
    setShowBoostModal(true);
  };

  const confirmBoost = async (amount) => {
    if (!boostTargetPost) return;
    const post = boostTargetPost;

    setBoostingId(post.id);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/${post.id}/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount,
            redirectScheme: 'myapp://',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || `Server error: ${response.status}`);
      }

      const checkoutUrl = result.url || result.sessionUrl || result.data?.url;

      if (!checkoutUrl) {
        throw new Error(`Missing URL in response: ${JSON.stringify(result)}`);
      }

      setShowBoostModal(false);
      navigation.navigate('CheckoutScreen', { checkoutUrl, postId: post.id || post._id });
    } catch (err) {
      Alert.alert('Unable to boost ad', err.message);
    } finally {
      setBoostingId(null);
    }
  };

  // Filter & sort for "All Posts" view
  const filteredAllPosts = useMemo(() => {
    let list = [...posts];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (postSort === 'boosted') {
      list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    } else if (postSort === 'likes') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      list.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
    }
    return list;
  }, [posts, searchQuery, postSort]);

  // Penalty Modal Component
  const penaltyModalComponent = (
    <Modal
      visible={showPenaltyModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPenaltyModal(false)}
    >
      <Pressable
        style={styles.penaltyModalOverlay}
        onPress={() => setShowPenaltyModal(false)}
      >
        <Pressable
          style={[
            styles.penaltyModalContainer,
            { backgroundColor: isDark ? '#1C192E' : '#FFFFFF', borderColor: isDark ? '#3D2A5C' : '#D8E8DC' },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.penaltyWarningBadge}>
            <MaterialIcons name="warning" size={32} color="#EF4444" />
          </View>

          <View style={styles.penaltyScoreCapsule}>
            <MaterialCommunityIcons name="shield-alert" size={14} color="#EF4444" />
            <Text style={styles.penaltyScoreCapsuleText}>
              Penalty Score: {penaltyRatio} (Critical Limit)
            </Text>
          </View>

          <Text style={[styles.penaltyModalTitle, { color: isDark ? '#FFFFFF' : '#0C0F0D' }]}>
            Posting Restricted
          </Text>

          <Text style={[styles.penaltyModalBody, { color: isDark ? '#CBD5E1' : '#475569' }]}>
            Your penalty score has reached <Text style={{ fontWeight: 'bold', color: '#EF4444' }}>{penaltyRatio}</Text> due to missed or cancelled bookings. You cannot create new posts until your penalty points are reduced below 3.
            {'\n\n'}
            Please submit an inquiry for your missed bookings as soon as possible to get approval from Administration and restore your account access.
          </Text>

          <TouchableOpacity
            style={styles.penaltySubmitBtn}
            onPress={() => {
              setShowPenaltyModal(false);
              navigation.navigate('SubmitInquiry');
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="rate-review" size={18} color="#FFFFFF" />
            <Text style={styles.penaltySubmitBtnText}>Submit Inquiry Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.penaltyDismissBtn, { borderColor: isDark ? '#303C33' : '#D8E8DC' }]}
            onPress={() => setShowPenaltyModal(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.penaltyDismissBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Close
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // Modern Section Header
  const header = (
    <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
      <View style={styles.sectionTitleArea}>
        <View style={styles.titleWithBadge}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('myPosts') || 'My Posts'}
          </Text>
          {posts.length > 0 && (
            <View style={[styles.countPill, { backgroundColor: isDark ? '#223226' : '#E8F5E9' }]}>
              <Text style={styles.countPillText}>{posts.length}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sectionSub, { color: C.textSub }]}>
          {posts.length} {t('advertisements') || 'advertisements'}
        </Text>
      </View>

      <View style={styles.headerButtonRow}>
        {posts.length > 0 && (
          <TouchableOpacity
            style={[
              styles.showAllPillBtn,
              {
                borderColor: C.border,
                backgroundColor: isDark ? '#1C251F' : '#F8FAF9',
              },
            ]}
            onPress={() => setShowAllPosts(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="view-headline" size={16} color={Colors.primary} />
            <Text style={styles.showAllPillText}>
              {t('showAll') || 'Show All'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.newPostBtnWrapper}
          onPress={handleNewPostPress}
          activeOpacity={0.85}
          disabled={checkingPenalty}
        >
          <LinearGradient
            colors={[Colors.primary, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.newPostBtnGradient}
          >
            {checkingPenalty ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="add" size={17} color="#fff" />
                <Text style={styles.newPostBtnText}>
                  {t('newPost') || 'New Post'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
        {header}
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: C.textSub }]}>Loading advertisements...</Text>
        </View>
        {penaltyModalComponent}
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
        {header}
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#233226' : '#E8F5E9' }]}>
            <MaterialIcons name="campaign" size={38} color={Colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>
            {t('noPostsYet') || 'No posts yet'}
          </Text>
          <Text style={[styles.emptySub, { color: C.textSub }]}>
            {t('createFirstPost') || 'Create your first advertisement to attract more customers'}
          </Text>
          <TouchableOpacity
            style={styles.emptyBtnWrapper}
            onPress={handleNewPostPress}
            disabled={checkingPenalty}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary, '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyBtnGradient}
            >
              {checkingPenalty ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.emptyBtnText}>
                    {t('newPost') || 'Create Post'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {penaltyModalComponent}
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      {header}

      {/* Main horizontal carousel of full post cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_W + 16}
        snapToAlignment="start"
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onOptions={handleOptions}
            onBoost={openBoostModal}
            onOpenDetail={openDetailModal}
            isDark={isDark}
            C={C}
            isBoosting={boostingId === post.id}
            t={t}
          />
        ))}
      </ScrollView>

      {/* Options modal (Edit / Delete) */}
      <OptionsModal
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        onEdit={() => handleEdit(selectedPost)}
        onDelete={() => handleDelete(selectedPost)}
        isDark={isDark}
        t={t}
      />

      {/* Boost modal with presets and calculation */}
      <BoostModal
        visible={showBoostModal}
        onClose={() => setShowBoostModal(false)}
        onConfirm={confirmBoost}
        isDark={isDark}
        isSubmitting={boostingId === boostTargetPost?.id}
      />

      {/* Full Post Detail Modal */}
      <PostDetailModal
        visible={showDetailModal}
        post={selectedDetailPost}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBoost={openBoostModal}
        onLike={handleLike}
        isDark={isDark}
        C={C}
        isBoosting={boostingId === selectedDetailPost?.id}
        t={t}
      />

      {/* "All Posts" Modal — User requirement: ONLY DISPLAY POST HEADER */}
      <Modal
        visible={showAllPosts}
        animationType="slide"
        onRequestClose={() => setShowAllPosts(false)}
      >
        <View style={[styles.allPostsModal, { backgroundColor: isDark ? '#0C0F0D' : '#F6F9F7' }]}>
          {/* Modal Header */}
          <View style={[styles.allPostsHeader, { borderBottomColor: C.border, backgroundColor: isDark ? '#161C18' : '#fff' }]}>
            <View>
              <View style={styles.titleWithBadge}>
                <Text style={[styles.allPostsTitle, { color: C.text }]}>
                  {t('allPosts') || 'All My Posts'}
                </Text>
                <View style={[styles.countPill, { backgroundColor: isDark ? '#233226' : '#E8F5E9' }]}>
                  <Text style={styles.countPillText}>{filteredAllPosts.length}</Text>
                </View>
              </View>
              <Text style={[styles.allPostsSub, { color: C.textSub }]}>
                Compact post header overview • Tap any post to view full details
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: isDark ? '#232D26' : '#F1F5F2' }]}
              onPress={() => setShowAllPosts(false)}
              hitSlop={8}
            >
              <MaterialIcons name="close" size={20} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#161C18' : '#fff' }]}>
            <View style={[styles.searchBox, { borderColor: C.border, backgroundColor: isDark ? '#1E2821' : '#F9FBFA' }]}>
              <MaterialIcons name="search" size={20} color={C.textSub} />
              <TextInput
                style={[styles.searchInput, { color: C.text }]}
                placeholder={t('searchPosts') || 'Search posts...'}
                placeholderTextColor={C.textSub}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={6}>
                  <MaterialIcons name="cancel" size={18} color={C.textSub} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sort Tabs */}
          <View style={styles.sortRow}>
            {[
              ['recent', t('recentlyCreated') || 'Recently Created'],
              ['boosted', t('mostBoosted') || 'Most Boosted'],
              ['likes', 'Most Liked'],
            ].map(([value, label]) => {
              const active = postSort === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setPostSort(value)}
                  style={[
                    styles.sortButton,
                    {
                      borderColor: active ? Colors.primary : C.border,
                      backgroundColor: active ? (isDark ? '#1C3124' : '#EAF7EE') : C.card,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={{
                      color: active ? Colors.primary : C.textSub,
                      fontSize: 12,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* List of compact POST HEADERS ONLY — Clicking any item opens full detail */}
          <ScrollView
            contentContainerStyle={styles.allPostsListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredAllPosts.length === 0 ? (
              <View style={styles.noSearchMatchBox}>
                <MaterialCommunityIcons name="text-search" size={40} color={C.textSub} />
                <Text style={[styles.noSearchMatchTitle, { color: C.text }]}>No posts match your search</Text>
                <Text style={[styles.noSearchMatchSub, { color: C.textSub }]}>Try searching with another keyword</Text>
              </View>
            ) : (
              filteredAllPosts.map((post) => (
                <PostHeaderCard
                  key={`header-${post.id}`}
                  post={post}
                  onOptions={handleOptions}
                  onBoost={openBoostModal}
                  isDark={isDark}
                  C={C}
                  isBoosting={boostingId === post.id}
                  onPress={() => openDetailModal(post)}
                  t={t}
                />
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {penaltyModalComponent}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Main Section Container
  section: {
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 2,
    marginBottom: 20,
    paddingTop: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  sectionTitleArea: {
    flex: 1,
    paddingRight: 8,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  showAllPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  showAllPillText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  newPostBtnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  newPostBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  newPostBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Carousel & Cards
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 12,
    paddingBottom: 18,
    gap: 14,
  },
  card: {
    width: CARD_W,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  boostBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Image & Placeholder
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 165,
    backgroundColor: '#E5E7EB',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  placeholderIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Body
  cardBody: {
    padding: 14,
    paddingBottom: 6,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
    lineHeight: 21,
  },
  postDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Liked By section
  likedByContainer: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  likedByHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  likedByHeader: {
    fontSize: 11,
    fontWeight: '700',
  },
  likedByNames: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Card Footer Actions
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  likeCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  boostBtnWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  boostGradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  boostBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  boostCounterPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  boostCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  // ── Post Header Card Styles (For "All Posts" view only!) ──
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerThumbContainer: {
    position: 'relative',
  },
  headerThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  headerThumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerThumbBoostBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    padding: 2.5,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  headerMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerBoostPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  headerBoostPillText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerQuickBoostBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMenuBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── "All Posts" Modal Styles ──
  allPostsModal: {
    flex: 1,
    paddingTop: 44,
  },
  allPostsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  allPostsTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  allPostsSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sortButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  allPostsListContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  noSearchMatchBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  noSearchMatchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  noSearchMatchSub: {
    fontSize: 13,
  },

  // ── Full Detail Modal Styles ──
  detailModalContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  detailBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  detailEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScrollContent: {
    paddingBottom: 40,
  },
  detailHeroImageWrapper: {
    width: '100%',
    height: 220,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  detailHeroImage: {
    width: '100%',
    height: '100%',
  },
  detailHeroPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailHeroTimePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailHeroTimeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  detailHeroBoostBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  detailHeroBoostText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  detailTitleRow: {
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  detailMetaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailStatText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  detailSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  detailDescText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  detailTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  likedByNamesList: {
    gap: 8,
  },
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
  },
  likerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likerAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  likerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailActionsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  detailBoostBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  detailBoostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  detailBoostBtnText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  detailSubActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailSubActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  detailSubActionText: {
    fontSize: 13.5,
    fontWeight: '700',
  },

  // ── Bottom Sheets / Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  sheetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // Boost modal specifics
  boostHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  boostIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boostTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  boostSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  presetDiscountText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  customBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 6,
  },
  customInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  boostErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  feePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  confirmBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  confirmBtnDisabled: {
    opacity: 0.55,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Loading & Empty States
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Penalty Modal Styles
  penaltyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  penaltyModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  penaltyWarningBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  penaltyScoreCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 12,
  },
  penaltyScoreCapsuleText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  penaltyModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  penaltyModalBody: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  penaltySubmitBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#166534',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  penaltySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  penaltyDismissBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  penaltyDismissBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
