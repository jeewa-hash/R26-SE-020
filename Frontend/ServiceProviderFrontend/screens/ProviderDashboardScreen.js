import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const ProviderDashboardScreen = () => {
  const stats = [
    { label: 'Appointments', value: 12 },
    { label: 'Earnings', value: '$520' },
    { label: 'Reviews', value: 34 },
  ];

  const upcoming = [
    { id: '1', title: 'Plumbing Check', time: '9:00 AM', customer: 'John Doe' },
    { id: '2', title: 'HVAC Maintenance', time: '11:30 AM', customer: 'Jane Smith' },
    { id: '3', title: 'Electrical Inspection', time: '2:00 PM', customer: 'Alex Johnson' },
  ];

  const actions = [
    { id: 'a1', label: 'Add Availability' },
    { id: 'a2', label: 'View Bookings' },
    { id: 'a3', label: 'Messages' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Provider Dashboard</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsRow}>
          {stats.map((item) => (
            <View key={item.label} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {upcoming.map((item) => (
          <View key={item.id} style={styles.appointmentCard}>
            <Text style={styles.appointmentTitle}>{item.title}</Text>
            <Text style={styles.appointmentText}>{item.time}</Text>
            <Text style={styles.appointmentText}>{item.customer}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {actions.map((item) => (
            <TouchableOpacity key={item.id} style={styles.actionButton}>
              <Text style={styles.actionText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F5F7FA',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1F2937',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  appointmentText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ProviderDashboardScreen;
