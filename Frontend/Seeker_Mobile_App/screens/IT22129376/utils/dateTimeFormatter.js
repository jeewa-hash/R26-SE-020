export const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (value) => {
  if (!value) return 'Not set';
  return `${formatDate(value)} • ${formatTime(value)}`;
};

export const formatDuration = (hours) => {
  const value = Number(hours);
  if (!Number.isFinite(value)) return 'Not set';
  if (value === 1) return '1 hour';
  return `${value} hours`;
};

export const formatCurrency = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'LKR 0';
  return `LKR ${value.toLocaleString('en-LK')}`;
};
