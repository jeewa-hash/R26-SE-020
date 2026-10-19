import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDurationPredictionPayload } from '../src/services/mlPayloadBuilderService.js';
test('selected canonical task and declared provider context reach the six-feature payload',()=>{
 const payload=buildDurationPredictionPayload({requestQuotation:{detectedCategory:'Electrical Services',detectedObject:'A long post title'},providerQuotation:{durationTaskContext:{serviceCategory:'Repairing',serviceType:'Electrical Repair',taskName:'Install Ceiling Fan'},yearsExperience:6,taskFrequencyPerMonth:8,plannedTeamSize:2,estimatedDurationHours:999}});
 assert.deepEqual(payload,{serviceCategory:'Repairing',serviceType:'Electrical Repair',taskName:'Install Ceiling Fan',yearsExperience:6,taskFrequencyPerMonth:8,plannedTeamSize:2});
});
test('missing provider measurements remain null rather than invented values',()=>{
 const payload=buildDurationPredictionPayload({requestQuotation:{},providerQuotation:{}});
 assert.equal(payload.yearsExperience,null);assert.equal(payload.taskFrequencyPerMonth,null);assert.equal(payload.plannedTeamSize,null);
});
