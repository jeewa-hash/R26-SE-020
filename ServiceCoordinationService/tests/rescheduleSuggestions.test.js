import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { toScheduleParts } from '../src/utils/timeUtils.js';
const source=fs.readFileSync(new URL('../src/services/rescheduleSlotService.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
test('alternatives are future valid slots, capped at three and exclude the old booking through context',async()=>{
 const seen=[];const suggest=vm.runInNewContext(source+'\nsuggestRescheduleSlots',{Date,toScheduleParts,validateRescheduleTime:async args=>{seen.push(args);return {isValid:toScheduleParts(args.startTime).time!=='09:00',warnings:[]};}});
 const result=await suggest({providerId:'p',currentDate:'2035-01-01',originalStartTime:'2035-01-01T08:00:00+05:30',estimatedDurationHours:1,booking:{_id:'old',providerId:'p'}});
 assert.equal(result.length,3);assert.ok(result.every(row=>row.startTime!=='09:00'));assert.ok(seen.every(row=>row.booking._id==='old'));assert.equal(result[0].startTime,'10:00');assert.equal(result[0].endTime,'11:00');
});
test('unverified travel is retained as unknown in suggestions',async()=>{
 const suggest=vm.runInNewContext(source+'\nsuggestRescheduleSlots',{Date,toScheduleParts,validateRescheduleTime:async()=>({isValid:true,warnings:['Missing coordinates'],message:'Travel unverified'})});
 const result=await suggest({providerId:'p',currentDate:'2035-01-01',estimatedDurationHours:1});assert.equal(result[0].riskLevel,'UNKNOWN');assert.equal(result[0].reason,'Travel unverified');
});
