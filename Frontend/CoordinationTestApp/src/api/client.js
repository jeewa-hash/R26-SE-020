import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOST = "192.168.8.101";

export const PROVIDER_LOGIN_API = `http://${HOST}:4003/login`;
export const SEEKER_LOGIN_API = `http://${HOST}:4003/seeker/login`;

export const COORDINATION_API = `http://${HOST}:5010/api/coordination`;

const api = axios.create({
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
