import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationsContext';
import i18n from '../locales';
import TaskDetailsModal from '../components/TaskDetailsModal';
import BidModal from '../components/BidModal';

const { height } = Dimensions.get('window');

const TABS = ['All', 'Jobs', 'Bids', 'Payments'];
const TAB_FILTERS = {
  All: () => true,
  Jobs: (n) => n.type === 'job_match' || n.type === 'quotation_request',
  Bids: (n) => n.type === 'bid_opening' || n.type === 'bid_accepted',
  Payments: (n) => n.type === 'payment',
};

export default function NotificationsScreen({ navigation }) {
  const { notifications, markAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('All');
  
  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [isBidVisible, setIsBidVisible] = useState(false);
  const [selectedJobForBid, setSelectedJobForBid] = useState(null);

  const filtered = notifications.filter(TAB_FILTERS[activeTab] || TAB_FILTERS.All);

  // Open the "Job Details" Modal
  const handleOpenDetails = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
    markAsRead(task.id);
  };

  // Open the "Bid Now" Bottom Sheet
  const handleOpenBid = (job) => {
    setSelectedJobForBid(job);
    setIsBidVisible(true);
    markAsRead(job.id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <TouchableOpacity>
          <MaterialIcons name="settings" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
          {TABS.map((tab) => (
            <TouchableOpacity 
              key={tab} 
              onPress={() => setActiveTab(tab)} 
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => (
          <NotificationCard 
            key={item.id} 
            item={item} 
            onPress={() => markAsRead(item.id)}
            onActionPress={() => {
              if (item.type === 'bid_opening') {
                handleOpenBid(item);
              } else {
                handleOpenDetails(item);
              }
            }} 
          />
        ))}
        {/* Padding for absolute Bottom Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 1. TASK DETAILS MODAL */}
      <TaskDetailsModal 
        visible={modalVisible}
        task={selectedTask}
        onDismiss={() => setModalVisible(false)}
        onChat={() => {
          setModalVisible(false);
          navigation.navigate('ChatScreen', { customer: selectedTask?.job?.customer || 'Client' });
        }}
        onQuote={() => {
          setModalVisible(false);
          navigation.navigate('QuotationTemplate', { task: selectedTask });
        }}
      />

      {/* 2. ATTRACTIVE BID MODAL (Bottom Sheet Style) */}
      <Modal
        visible={isBidVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBidVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsBidVisible(false)}
        >
          <View style={styles.modalFlexFiller} />
          <BidModal 
            job={selectedJobForBid} 
            onDismiss={() => setIsBidVisible(false)} 
          />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function NotificationCard({ item, onPress, onActionPress }) {
  const isSi = i18n.language === 'si';
  const title = isSi ? item.titleSi : item.title;
  const body = isSi ? item.bodySi : item.body;

  return (
    <TouchableOpacity 
      style={[styles.card, !item.read && styles.unreadCard]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardInner}>
        <View style={[styles.iconBox, { backgroundColor: item.iconBg || '#F3F4F6' }]}>
          <MaterialIcons name={item.icon || 'notifications'} size={24} color={item.iconColor || '#7C3AED'} />
        </View>

        <View style={styles.contentBox}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          <Text style={styles.cardBody} numberOfLines={2}>{body}</Text>

          {item.type === 'job_match' && (
            <View style={styles.jobPreview}>
              <View style={styles.jobRow}>
                <Text style={styles.jobLocation}><MaterialIcons name="place" size={12}/> {item.job?.location}</Text>
                <Text style={styles.jobPrice}>{item.job?.budget}</Text>
              </View>
              <TouchableOpacity style={styles.primaryAction} onPress={onActionPress}>
                <Text style={styles.primaryActionText}>View Job Details</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'bid_opening' && (
            <View style={styles.actionRow}>
              <View style={styles.bidMeta}>
                <Text style={styles.bidPrice}>{item.bidDetails?.basePrice}</Text>
                <Text style={styles.bidTime}>⌛ {item.bidDetails?.deadline}</Text>
              </View>
              <TouchableOpacity style={styles.bidButton} onPress={onActionPress}>
                <Text style={styles.bidButtonText}>Bid Now</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.type === 'quotation_request' && (
            <View style={styles.actionRow}>
              <View style={styles.quoteMeta}>
                <Text style={styles.quoteUrgency}>Urgency: {item.quoteDetails?.urgency}</Text>
              </View>
              <TouchableOpacity style={styles.quoteButton} onPress={onActionPress}>
                <Text style={styles.quoteButtonText}>Send Quote</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#FFF' 
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  tabsContainer: { backgroundColor: '#FFF', paddingBottom: 10 },
  tabsContent: { paddingHorizontal: 20, gap: 10 },
  tab: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  listContent: { padding: 16 },
  
  card: { 
    backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#7C3AED', backgroundColor: '#FDFDFF' },
  cardInner: { flexDirection: 'row', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  contentBox: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', flex: 1 },
  timeText: { fontSize: 11, color: '#9CA3AF' },
  cardBody: { fontSize: 13, color: '#4B5563', lineHeight: 18, marginBottom: 10 },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  bidButton: { backgroundColor: '#7C3AED', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  bidButtonText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  bidPrice: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  bidTime: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },

  quoteButton: { borderWidth: 1.5, borderColor: '#7C3AED', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  quoteButtonText: { color: '#7C3AED', fontWeight: '700', fontSize: 12 },
  quoteUrgency: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

  jobPreview: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12 },
  jobRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jobLocation: { fontSize: 11, color: '#6B7280' },
  jobPrice: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  primaryAction: { backgroundColor: '#EEF2FF', padding: 10, borderRadius: 10, alignItems: 'center' },
  primaryActionText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },

  // Modal Overlays
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalFlexFiller: { 
    flex: 1 
  }
});