import { addHours, minutesBetween } from "../utils/timeUtils.js";
import { DELAY_RULES } from "../constants/delayRules.js";

export const analyzeStartDelay = ({
  scheduledStartTime,
  actualStartTime,
  estimatedDurationHours
}) => {
  const startDelayMinutes = Math.max(
    0,
    minutesBetween(scheduledStartTime, actualStartTime)
  );

  const delayed =
    startDelayMinutes > DELAY_RULES.START_DELAY_THRESHOLD_MINUTES;

  const updatedExpectedEndTime = addHours(
    actualStartTime,
    estimatedDurationHours
  );

  return {
    delayed,
    startDelayMinutes,
    updatedExpectedEndTime,
    startDelayStatus: delayed ? "delayed_start" : "on_time_start"
  };
};

export const analyzeExecutionDelay = ({
  scheduledEndTime,
  updatedExpectedEndTime
}) => {
  const executionDelayMinutes = Math.max(
    0,
    minutesBetween(scheduledEndTime, updatedExpectedEndTime)
  );

  const delayed =
    executionDelayMinutes > DELAY_RULES.EXECUTION_DELAY_THRESHOLD_MINUTES;

  return {
    delayed,
    executionDelayMinutes,
    executionDelayStatus: delayed ? "execution_delayed" : "execution_on_time"
  };
};