export const SEEKER_TABS = [
  { id: 'Home', routeName: 'Home', label: 'Home', labelSi: 'මුල් පිටුව', icon: 'home', activeIcon: 'home-filled' },
  { id: 'Services', routeName: 'SeekerServices', label: 'My Services', labelSi: 'මගේ සේවා', icon: 'assignment', activeIcon: 'assignment' },
  { id: 'Create', routeName: 'CreatePostScreen', label: 'Post Job', labelSi: 'නව ඉල්ලුම', icon: 'add', isCreateButton: true },
  { id: 'Bookings', routeName: 'BookingsScreen', label: 'Bookings', labelSi: 'ඇණවුම්', icon: 'event-note', activeIcon: 'event-note' },
  { id: 'Profile', routeName: 'ProfileScreen', label: 'Account', labelSi: 'ගිණුම', icon: 'person-outline', activeIcon: 'person' },
];
const services = new Set(['FindService', 'SeekerServices', 'SeekerServiceSessions', 'SeekerServiceSessionDetails', 'MyPostsScreen', 'PostResponsesScreen', 'SeekerCalendar', 'FeedScreen', 'ProvidersScreen', 'ProviderProfile', 'profileOfProvider', 'ProfileOfProvider', 'FollowUpScreen', 'BiddingScreen', 'BidResponsesScreen', 'UserQuotesScreen', 'MyJobsScreen', 'IT22129376JobDetails', 'IT22129376QuoteDetails', 'IT22129376CoordinationReview', 'IT22129376SuggestedSlots', 'IT22129376ConfirmJob']);
export function seekerActiveTab(route) {
  if (services.has(route)) return 'Services';
  if (['BookingsScreen', 'RequestQuotationDetails', 'IT22129376ScheduledJobDetails', 'IT22129376JobHistoryDetails', 'RescheduleScreen'].includes(route)) return 'Bookings';
  if (route === 'CreatePostScreen') return 'Create';
  if (route === 'Home' || route === 'HomeScreen') return 'Home';
  if (['ProfileScreen', 'EditProfileScreen', 'SettingsScreen', 'HelpScreen', 'StarPointsScreen', 'PaymentScreen', 'SpendAnalyticsScreen', 'HistoryScreen', 'FeedbackScreen'].includes(route)) return 'Profile';
  return null;
}
export function openSeekerTab(navigation, routeName) {
  if (!navigation || (navigation.isReady && !navigation.isReady())) return;
  const state = navigation.getRootState?.() || navigation.getState?.();
  // Return to an existing tab instead of adding another copy to the stack.
  if (navigation.popTo && state?.routes?.some(route => route.name === routeName)) navigation.popTo(routeName);
  else navigation.navigate(routeName);
}
