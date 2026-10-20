import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { buildDurationPredictionPayload } from '../src/services/mlPayloadBuilderService.js';
const source=fs.readFileSync(new URL('../src/services/rescheduleDurationService.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup(prediction={predictedDurationMins:98,source:'TRAINED_DURATION_MODEL',modelVersion:'current'}) {
 const calls=[];
 const run=vm.runInNewContext(source+'\npredictRescheduleDuration',{
  Date,buildDurationPredictionPayload,
  getProviderQuotationById:async id=>{calls.push(id);return {durationTaskContext:{serviceCategory:'Repairing',serviceType:'Plumbing Repair',taskName:'Repair Tap'},yearsExperience:8,plannedTeamSize:1}},
  getRequestQuotationById:async id=>{calls.push(id);return {urgencyLevel:'Normal'}},
  predictDuration:async payload=>{calls.push(payload);return prediction},
  estimateServiceDuration:()=>({averageDurationHours:2}),
 });return {run:()=>run({externalQuotationId:'quote',externalRequestQuotationId:'request',estimatedDurationHours:9}),calls};
}
test('rescheduling calls duration model with authoritative task inputs instead of reusing nine-hour old duration',async()=>{
 const x=setup(),result=await x.run();assert.equal(result.evidence.predictedDurationMins,98);assert.equal(result.durationHours,98/60);
 assert.equal(x.calls[2].yearsExperience,8);assert.equal(result.evidence.modelVersion,'current');
});
test('model outage uses the same labelled reference fallback as initial coordination',async()=>{
 const result=await setup(null).run();assert.equal(result.evidence.source,'REFERENCE_DURATION_FALLBACK');assert.equal(result.evidence.predictedDurationMins,120);assert.equal(result.evidence.prediction,null);
});
