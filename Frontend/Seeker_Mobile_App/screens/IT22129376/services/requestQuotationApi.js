import { API_BASE_URL } from "../../../config";

export const createRequestQuotation = async (payload, token = null) => {
  const response = await fetch(`${API_BASE_URL}/request-quotations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      response.status === 409
        ? "You have already requested a quotation from this provider for this service."
        : data?.message || "Could not send the quotation request. Please try again."
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
