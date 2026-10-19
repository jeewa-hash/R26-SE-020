const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../utils/completedEarnings.js'),'utf8').replace('export function','function');const summarize=vm.runInNewContext(source+'\nsummarizeCompletedEarnings');
const now=new Date('2026-10-20T12:00:00Z');
const rows=[{bookingStatus:'COMPLETED',scheduledDate:'2026-10-19',finalAmount:1000},{bookingStatus:'COMPLETED',scheduledDate:'2026-10-19',finalAmount:1720},{bookingStatus:'COMPLETED',scheduledDate:'2026-10-18',finalAmount:2000},{bookingStatus:'IN_PROGRESS',scheduledDate:'2026-10-20',finalAmount:9999},{bookingStatus:'COMPLETED',scheduledDate:'2026-09-19',finalAmount:500},{bookingStatus:'COMPLETED',scheduledDate:'2025-12-19',finalAmount:250}];
test('completed monthly jobs produce earnings independently of billing',()=>{const result=summarize(rows,'Month',now);assert.equal(result.totalIncome,4720);assert.equal(result.completedBookingsCount,3);});
test('year and lifetime filters include the correct completed jobs',()=>{assert.equal(summarize(rows,'Year',now).totalIncome,5220);assert.equal(summarize(rows,'All Time',now).totalIncome,5470);});
test('verified empty history yields zero',()=>assert.equal(summarize([],'Month',now).totalIncome,0));
