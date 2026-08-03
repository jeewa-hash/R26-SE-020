import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationsContext = createContext();

const INITIAL_NOTIFICATIONS = [
  {
    id: '1',
    type: 'job_match',
    read: false,
    time: 'Just Now',
    title: 'New Job Match — 92% AI Match',
    titleSi: 'නව රැකියා ගැළපීම — 92% AI ගැළපීම',
    body: 'Urgent plumbing repair needed in Colombo 03.',
    bodySi: 'කොළඹ 03 හි හදිසි නළ අලුත්වැඩියාවක් අවශ්‍යයි.',
    icon: 'auto-awesome',
    iconColor: '#7C3AED',
    iconBg: '#F5F3FF',
    aiMatch: 92,
    job: {
      id: 'n1',
      customer: 'Kumara Perera',
      location: 'Colombo 03',
      category: 'Plumbing',
      description: 'Urgent plumbing repair needed. Leaking pipe in kitchen area.',
      budget: 'LKR 4,500',
      applied: 3,
      views: 18,
      urgent: true,
    },
  },
  {
    id: '7',
    type: 'bid_opening',
    read: false,
    time: '5 mins ago',
    title: 'Bidding Open: Luxury Villa Cleaning',
    titleSi: 'බිඩිං විවෘතයි: සුඛෝපභෝගී විලා පිරිසිදු කිරීම',
    body: 'A high-value cleaning task just opened for bidding in your area.',
    bodySi: 'ඔබේ ප්‍රදේශයේ ඉහළ වටිනාකමකින් යුත් පිරිසිදු කිරීමේ කාර්යයක් විවෘත වී ඇත.',
    icon: 'gavel',
    iconColor: '#F59E0B',
    iconBg: '#FFFBEB',
    bidDetails: {
      basePrice: 'LKR 12,000',
      deadline: '2 hours left',
    }
  },
  {
    id: '8',
    type: 'quotation_request',
    read: false,
    time: '12 mins ago',
    title: 'Quotation Requested',
    titleSi: 'මිල ගණන් ඉල්ලීමක්',
    body: 'Saman G. requested a custom quote for Garden Landscaping.',
    bodySi: 'සමන් ජී. වත්ත අලංකරණය සඳහා මිල ගණන් කැඳවා ඇත.',
    icon: 'request-quote',
    iconColor: '#EC4899',
    iconBg: '#FDF2F8',
    quoteDetails: {
      urgency: 'High',
      area: '1,200 sqft'
    }
  },
  {
    id: '2',
    type: 'bid_accepted',
    read: false,
    time: '15 mins ago',
    title: 'Bid Accepted! 🎉',
    titleSi: 'ඉල්ලුම් පිළිගන්නා ලදී! 🎉',
    body: 'Anoma Silva accepted your bid for Electrical Installation.',
    bodySi: 'අනෝමා සිල්වා ඔබේ ඉල්ලුම පිළිගෙන ඇත.',
    icon: 'check-circle',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
  }
];

export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);