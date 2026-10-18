import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Image,
	RefreshControl,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
import { AUTH_SERVICE_URL, PROVIDER_LIST_URL } from '../config';
import { useTheme } from '../hooks/useTheme';

const normalize = (value) => String(value || '')
	.toLowerCase()
	.replace(/&/g, ' and ')
	.replace(/[_/+-]/g, ' ')
	.replace(/[^a-z0-9\s]/g, ' ')
	.replace(/\bservices?\b/g, ' ')
	.replace(/\s+/g, ' ')
	.trim();

const stem = (word) => word.replace(/ies$/, 'y').replace(/ing$/, '').replace(/s$/, '');

const getPortfolioTerms = (item) => {
	const provider = item?.provider || {};
	const portfolio = item?.portfolio || {};
	return [
		provider.category,
		...(Array.isArray(portfolio.categories) ? portfolio.categories : []),
		...(Array.isArray(portfolio.labels) ? portfolio.labels : []),
		...(Array.isArray(portfolio.specific_labels) ? portfolio.specific_labels : []),
		...(Array.isArray(portfolio.tags) ? portfolio.tags : []),
	].filter(Boolean);
};

const matchingTermsFor = (item, category) => {
	const targetWords = new Set(normalize(category).split(' ').filter(Boolean).map(stem));
	return getPortfolioTerms(item).filter((term) =>
		normalize(term).split(' ').filter(Boolean).map(stem).some((word) => targetWords.has(word))
	);
};

export default function CategoryProvidersScreen({ route, navigation }) {
	const category = route.params?.category || 'Services';
	const parentCategory = route.params?.parentCategory || '';
	const searchTerms = [category, parentCategory].filter(Boolean);
	const { isDarkMode } = useTheme();
	const [providers, setProviders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState('');

	const loadProviders = useCallback(async () => {
		setError('');
		try {
			const response = await fetch(PROVIDER_LIST_URL);
			const data = await response.json();
			if (!response.ok || !data.success) {
				throw new Error(data.message || data.error || `Could not load providers (${response.status})`);
			}

			const matched = (Array.isArray(data.providers) ? data.providers : [])
				.filter((item) => {
					const provider = item?.provider || {};
					return Boolean(provider.id || provider._id) &&
						provider.isVerified !== false &&
						!provider.isBlocked &&
						!provider.isRejected &&
						!provider.isSuspended &&
						searchTerms.some((term) => matchingTermsFor(item, term).length > 0);
				})
				.map((item) => ({
					...item,
					match: {
						...(item.match || {}),
						category,
						matchedTerms: [...new Set(searchTerms.flatMap((term) => matchingTermsFor(item, term)))],
					},
				}));

			setProviders(matched);
		} catch (loadError) {
			setProviders([]);
			setError(loadError.message || 'Could not load providers.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [category, parentCategory]);

	useEffect(() => {
		setLoading(true);
		loadProviders();
	}, [loadProviders]);

	const refresh = useCallback(() => {
		setRefreshing(true);
		loadProviders();
	}, [loadProviders]);

	const openProfile = (item) => {
		navigation.navigate('profileOfProvider', { providerItem: item });
	};

	const renderProvider = ({ item }) => {
		const provider = item.provider || {};
		const name = provider.name || provider.fullName || provider.email?.split('@')[0] || 'Provider';
		const imagePath = String(provider.profileImage || '').replace(/\\/g, '/');
		const imageUrl = imagePath
			? (imagePath.startsWith('http') ? imagePath : `${AUTH_SERVICE_URL}/${imagePath.replace(/^\/+/, '')}`)
			: null;

		return (
			<TouchableOpacity
				style={[styles.providerRow, isDarkMode && styles.providerRowDark]}
				onPress={() => openProfile(item)}
				activeOpacity={0.78}
			>
				{imageUrl ? (
					<Image source={{ uri: imageUrl }} style={styles.avatar} />
				) : (
					<View style={[styles.avatar, styles.avatarFallback]}>
						<Ionicons name="person-outline" size={21} color="#52606D" />
					</View>
				)}
				<View style={styles.providerDetails}>
					<View style={styles.nameLine}>
						<Text style={[styles.providerName, isDarkMode && styles.textLight]} numberOfLines={1}>
							{name}
						</Text>
						{provider.isVerified && <Ionicons name="checkmark-circle" size={16} color="#07836A" />}
					</View>
					<Text style={[styles.providerMeta, isDarkMode && styles.textMuted]} numberOfLines={1}>
						{[provider.category, provider.district].filter(Boolean).join(' · ') || 'Service provider'}
					</Text>
					<View style={styles.tags}>
						{(item.match?.matchedTerms || []).slice(0, 3).map((term) => (
							<Text key={term} style={[styles.tag, isDarkMode && styles.tagDark]} numberOfLines={1}>
								{term}
							</Text>
						))}
					</View>
				</View>
				<Ionicons name="chevron-forward" size={19} color={isDarkMode ? '#AAB6C5' : '#667085'} />
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={[styles.screen, isDarkMode && styles.screenDark]}>
			<StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
			<PageHeader title={`${category} Providers`} onBack={() => navigation.goBack()} />
			<FlatList
				data={providers}
				keyExtractor={(item) => String(item.provider.id || item.provider._id)}
				renderItem={renderProvider}
				contentContainerStyle={styles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
				ListHeaderComponent={(
					<Text style={[styles.resultCount, isDarkMode && styles.textMuted]}>
						{loading ? 'Finding providers...' : `${providers.length} matching providers`}
					</Text>
				)}
				ListEmptyComponent={(
					<View style={styles.emptyState}>
						{loading ? <ActivityIndicator size="large" color="#07836A" /> : (
							<>
								<Ionicons name={error ? 'cloud-offline-outline' : 'search-outline'} size={40} color="#718096" />
								<Text style={[styles.emptyText, isDarkMode && styles.textLight]}>
									{error || `No verified providers match ${category} yet.`}
								</Text>
							</>
						)}
					</View>
				)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: '#F7F8FA' },
	screenDark: { backgroundColor: '#101624' },
	listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
	resultCount: { color: '#667085', fontSize: 13, marginBottom: 12 },
	providerRow: {
		flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
		borderColor: '#E4E7EC', borderWidth: 1, borderRadius: 8,
		padding: 12, marginBottom: 10, gap: 12,
	},
	providerRowDark: { backgroundColor: '#192234', borderColor: '#344054' },
	avatar: { width: 54, height: 54, borderRadius: 27 },
	avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7ECEF' },
	providerDetails: { flex: 1, minWidth: 0 },
	nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	providerName: { color: '#17212B', fontSize: 15, fontWeight: '700', flexShrink: 1 },
	providerMeta: { color: '#667085', fontSize: 12, marginTop: 3 },
	tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
	tag: { color: '#146C5B', backgroundColor: '#E4F4EF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, maxWidth: 130 },
	tagDark: { color: '#9DE1CB', backgroundColor: '#183B38' },
	emptyState: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
	emptyText: { color: '#475467', fontSize: 14, textAlign: 'center' },
	textLight: { color: '#F2F4F7' },
	textMuted: { color: '#AAB6C5' },
});
