export const addHours = (date, hours) => new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);
export const minutesBetween = (start, end) => Math.round((new Date(end).getTime() - new Date(start).getTime()) / (60 * 1000));
export const hasTimeOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();
  return aStart < bEnd && aEnd > bStart;
};
export const addMinutes = (date, minutes) => {
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
};

export const formatSlotLabel = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })} - ${end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
};