import axios from "axios";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://127.0.0.1:4000/api/auth";
const ADMIN_SERVICE_URL = process.env.ADMIN_SERVICE_URL || "http://127.0.0.1:4003/admin";

export const getProviderByIdFromAdmin = async (providerId, token = null) => {
  try {
    const headers = token ? { Authorization: token } : {};

    // This assumes admin service has user listing/details endpoints.
    // If not, we will use snapshots sent from frontend.
    const response = await axios.get(`${AUTH_SERVICE_URL}/admin/users`, { headers });

    const providers = response.data?.providers || [];
    return providers.find((provider) => String(provider._id) === String(providerId)) || null;
  } catch (error) {
    console.warn("Provider lookup failed. Continuing with snapshot/default data:", error.message);
    return null;
  }
};

export const getSeekerByIdFromAdmin = async (seekerId, token = null) => {
  try {
    const headers = token ? { Authorization: token } : {};

    const response = await axios.get(`${AUTH_SERVICE_URL}/admin/users`, { headers });

    const seekers = response.data?.seekers || [];
    return seekers.find((seeker) => String(seeker._id) === String(seekerId)) || null;
  } catch (error) {
    console.warn("Seeker lookup failed. Continuing with snapshot/default data:", error.message);
    return null;
  }
};

export const createAdminAuditLog = async ({
  action,
  category,
  adminId,
  target,
  metadata
}) => {
  try {
    if (!adminId) return null;

    const response = await axios.post(`${AUTH_SERVICE_URL}/admin/audit-logs/internal`, {
      action,
      category,
      adminId,
      target,
      metadata
    });

    return response.data;
  } catch (error) {
    console.warn("External audit log creation failed:", error.message);
    return null;
  }
};