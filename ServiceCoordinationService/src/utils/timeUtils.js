export const addHours = (date, hours) => new Date(new Date(date).getTime() + hours * 60 * 60 * 1000);
export const minutesBetween = (start, end) => Math.round((new Date(end).getTime() - new Date(start).getTime()) / (60 * 1000));
export const hasTimeOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();
  return aStart < bEnd && aEnd > bStart;
};
