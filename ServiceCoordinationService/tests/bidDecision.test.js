import test from 'node:test';
import assert from 'node:assert/strict';
import { decideBidCoordination } from '../src/services/bidDecisionService.js';
import { evaluateCoordinationFeasibility } from '../src/services/coordinationFeasibilityService.js';
const decide = scheduleEvaluation => decideBidCoordination({ priceEvaluation: {}, scheduleEvaluation });
test('first available job ignores legacy high risk', () => {
  const feasibility = evaluateCoordinationFeasibility({ gapFromPreviousBookingMins: null });
  assert.equal(decide({ ...feasibility, conflictDetected: false, delayRiskLevel: 'High' }).finalDecision, 'CAN_ACCEPT');
});
test('working-hours or booking conflicts still block the first job', () => {
  assert.equal(decide({ conflictDetected: true, conflictReason: 'Outside working hours' }).finalDecision, 'RESCHEDULE_REQUIRED');
});
test('previous job travel cannot fit between end and new start', () => {
  const feasibility = evaluateCoordinationFeasibility({ gapFromPreviousBookingMins: 20, estimatedTravelTimeMins: 35 });
  const result = decide({ ...feasibility, coordinationReason: feasibility.reason, conflictDetected: false });
  assert.equal(result.finalDecision, 'RESCHEDULE_REQUIRED');
  assert.match(result.recommendedAction, /35 minutes/);
});
test('enough travel time with short buffer permits caution', () => {
  const feasibility = evaluateCoordinationFeasibility({ gapFromPreviousBookingMins: 40, estimatedTravelTimeMins: 35, minimumBufferMins: 15 });
  assert.equal(decide(feasibility).finalDecision, 'AVAILABLE_WITH_CAUTION');
});
test('enough travel and buffer permit booking', () => {
  const feasibility = evaluateCoordinationFeasibility({ gapFromPreviousBookingMins: 60, estimatedTravelTimeMins: 35, minimumBufferMins: 15 });
  assert.equal(decide(feasibility).finalDecision, 'CAN_ACCEPT');
});
