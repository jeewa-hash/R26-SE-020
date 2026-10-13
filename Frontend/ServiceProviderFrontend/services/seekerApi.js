import axios from 'axios';
import { CONFIG } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const seekerApi = axios.create({
  baseURL: CONFIG.SEEKER_SERVICE_URL,
  timeout: 15000,
});

seekerApi.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

export const getSeekerPosts = async (viewerId) => {
  const params = viewerId ? { viewerId } : {};
  const response = await seekerApi.get('/posts/', { params });
  return response.data;
};

export const getPostById = async (postId, viewerId) => {
  const params = viewerId ? { viewerId } : {};
  const response = await seekerApi.get(`/posts/${postId}`, { params });
  return response.data;
};

export const applyPost = async (postId, payload) => {
  const response = await seekerApi.post(`/posts/${postId}/apply`, payload);
  return response.data;
};

export const getPostsByUserId = async (userId) => {
  const response = await seekerApi.get(`/posts/user/${userId}`);
  return response.data;
};

export default seekerApi;
