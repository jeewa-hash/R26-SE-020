import { create } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOST = "192.168.1.100";

export const PROVIDER_LOGIN_API = `http://${HOST}:4003/login`;
export const SEEKER_LOGIN_API = `http://${HOST}:4003/seeker/login`;

const COORDINATION_SERVICE_URL = (process.env.EXPO_PUBLIC_COORDINATION_API_URL ||
  'http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com').replace(/\/+$/, '');

export const COORDINATION_API = `${COORDINATION_SERVICE_URL}/api/coordination`;

const api = create({
  baseURL: COORDINATION_API,            
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = global.authToken || (await AsyncStorage.getItem("token"));

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
