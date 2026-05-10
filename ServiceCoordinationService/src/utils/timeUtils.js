
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
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  export function calculateGapMinutes(previousEndTime, nextStartTime) {
    const previousEnd = timeToMinutes(previousEndTime);
    const nextStart = timeToMinutes(nextStartTime);
  
    return nextStart - previousEnd;
  }