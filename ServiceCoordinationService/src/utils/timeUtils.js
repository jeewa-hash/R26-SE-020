// Availability hours are Sri Lanka wall-clock times, independent of the host TZ.
export const SCHEDULING_TIME_ZONE = "Asia/Colombo";

export function toScheduleParts(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid schedule date");
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHEDULING_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map(({ type, value }) => [type, value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}


export function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }
  
  export function addHoursToTime(startTime, hours) {
    const [h, m] = startTime.split(":").map(Number);
  
    const date = new Date();
    date.setHours(h, m, 0, 0);
    date.setMinutes(date.getMinutes() + hours * 60);
  
    return date.toTimeString().slice(0, 5);
  }
  
  export function hasTimeOverlap(startA, endA, startB, endB) {
    const aStart = timeToMinutes(startA);
    const aEnd = timeToMinutes(endA);
    const bStart = timeToMinutes(startB);
    const bEnd = timeToMinutes(endB);
  
    return aStart < bEnd && aEnd > bStart;
  }
  
  export function getDayName(dateString) {
    const date = new Date(`${dateString}T12:00:00+05:30`);
    return date.toLocaleDateString("en-US", { weekday: "long", timeZone: SCHEDULING_TIME_ZONE });
  }

  export function calculateGapMinutes(previousEndTime, nextStartTime) {
    const previousEnd = timeToMinutes(previousEndTime);
    const nextStart = timeToMinutes(nextStartTime);
  
    return nextStart - previousEnd;
  }