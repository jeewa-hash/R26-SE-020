import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const NOTIFICATION_THEMES = {
  quote: {
    accentColor: '#8B5CF6',
    bgColor: '#FFFFFF',
    iconBg: '#8B5CF618',
    iconFamily: 'Ionicons',
    iconName: 'document-text',
    badge: 'Quotation',
  },
  bid: {
    accentColor: '#F59E0B',
    bgColor: '#FFFFFF',
    iconBg: '#F59E0B18',
    iconFamily: 'Ionicons',
    iconName: 'gavel',
    badge: 'New Bid',
  },
  booking: {
    accentColor: '#10B981',
    bgColor: '#FFFFFF',
    iconBg: '#10B98118',
    iconFamily: 'Ionicons',
    iconName: 'calendar',
    badge: 'Booking',
  },
  message: {
    accentColor: '#3B82F6',
    bgColor: '#FFFFFF',
    iconBg: '#3B82F618',
    iconFamily: 'Ionicons',
    iconName: 'chatbubble-ellipses',
    badge: 'Message',
  },
  high_demand_alert: {
    accentColor: '#6366F1',
    bgColor: '#FFFFFF',
    iconBg: '#6366F118',
    iconFamily: 'MaterialIcons',
    iconName: 'trending-up',
    badge: 'Demand Alert',
  },
  success: {
    accentColor: '#10B981',
    bgColor: '#FFFFFF',
    iconBg: '#10B98118',
    iconFamily: 'Ionicons',
    iconName: 'checkmark-circle',
    badge: 'Success',
  },
  error: {
    accentColor: '#EF4444',
    bgColor: '#FFFFFF',
    iconBg: '#EF444418',
    iconFamily: 'Ionicons',
    iconName: 'alert-circle',
    badge: 'Alert',
  },
  info: {
    accentColor: '#0EA5E9',
    bgColor: '#FFFFFF',
    iconBg: '#0EA5E918',
    iconFamily: 'Ionicons',
    iconName: 'information-circle',
    badge: 'Info',
  },
};

const BasePopupToast = ({ text1, text2, props, type = 'info', onPress }) => {
  const theme = NOTIFICATION_THEMES[type] || NOTIFICATION_THEMES.info;
  const customBadge = props?.badge || theme.badge;
  const actionText = props?.actionText || 'Tap to view';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (props?.onPress) {
      props.onPress();
    }
    Toast.hide();
  };

  const handleDismiss = () => {
    Toast.hide();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[
        styles.toastContainer,
        {
          borderLeftColor: theme.accentColor,
        },
      ]}
    >
      {/* Icon Badge */}
      <View style={[styles.iconWrapper, { backgroundColor: theme.iconBg }]}>
        {theme.iconFamily === 'MaterialIcons' ? (
          <MaterialIcons name={theme.iconName} size={22} color={theme.accentColor} />
        ) : (
          <Ionicons name={theme.iconName} size={22} color={theme.accentColor} />
        )}
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        <View style={styles.headerRow}>
          <View style={[styles.badgeTag, { backgroundColor: theme.iconBg }]}>
            <Text style={[styles.badgeText, { color: theme.accentColor }]}>{customBadge}</Text>
          </View>
          <Text style={styles.timeAgo}>Just now</Text>
        </View>

        {text1 ? (
          <Text style={styles.title} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}

        {text2 ? (
          <Text style={styles.message} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Text style={[styles.actionLink, { color: theme.accentColor }]}>
            {actionText} →
          </Text>
        </View>
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const customToastConfig = {
  // Custom styled types
  quote: (props) => <BasePopupToast {...props} type="quote" />,
  bid: (props) => <BasePopupToast {...props} type="bid" />,
  booking: (props) => <BasePopupToast {...props} type="booking" />,
  message: (props) => <BasePopupToast {...props} type="message" />,
  high_demand_alert: (props) => <BasePopupToast {...props} type="high_demand_alert" />,
  popupSuccess: (props) => <BasePopupToast {...props} type="success" />,
  popupError: (props) => <BasePopupToast {...props} type="error" />,
  popupInfo: (props) => <BasePopupToast {...props} type="info" />,
  notification: (props) => {
    const customType = props?.props?.notificationType || 'info';
    return <BasePopupToast {...props} type={customType} />;
  },
};

const styles = StyleSheet.create({
  toastContainer: {
    width: width - 32,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 5,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'flex-start',
    marginTop: 6,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  contentWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgeTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeAgo: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actionLink: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
});

export default customToastConfig;
