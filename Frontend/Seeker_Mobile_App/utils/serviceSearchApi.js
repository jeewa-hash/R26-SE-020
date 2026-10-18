import AsyncStorage from '@react-native-async-storage/async-storage';
import { TEXT_MODEL_URL } from '../config';
import { fetchSeekerWithTimeout } from './seekerHttp';

export async function startServiceSearch(text, language = 'en') {
  if (!text?.trim()) throw new Error('Describe the service you need.');
  const token = await AsyncStorage.getItem('userToken');
  if (!token) throw new Error('Please sign in again to find a service.');
  const response = await fetchSeekerWithTimeout(`${TEXT_MODEL_URL}/text-predict`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: text.trim(), app_lan: language === 'si' ? 'si' : 'en' }),
  });
  const result = await response.json();
  if (!response.ok || !result.session_id) throw new Error(result.error || result.message || 'Unable to start the service search. Please try again.');
  return result;
}
