import axios from 'axios';
import { SEEKER_SERVICE_URL } from '../config';

const seekerApi = axios.create({
  baseURL: SEEKER_SERVICE_URL,
  timeout: 10000,
});

export const getSeekerPosts = async () => {
  const response = await seekerApi.get('/');
  return response.data;
};

export const getPostById = async (postId) => {
  const response = await seekerApi.get(`/${postId}`);
  return response.data;
};

export default seekerApi;
