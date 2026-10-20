import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/services/routing/googleRoutesService.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup(){
 const calls=[];
 const get=vm.runInNewContext(source+'\ngetGoogleRoute',{
  Date,process:{env:{GOOGLE_MAPS_API_KEY:'test-key'}},
  axios:{post:async(...args)=>{calls.push(args);return {data:{routes:[{duration:'901s',distanceMeters:8780}]}}}},
 });return {get,calls};
}
test('route forecasts traffic at the planned departure using optimal routing and rounds minutes upward',async()=>{
 const x=setup(),departure='2035-01-01T06:30:00.000Z';
 const result=await x.get(6.9,79.8,6.8,79.9,{departureTime:departure});
 assert.equal(x.calls[0][1].departureTime,departure);assert.equal(x.calls[0][1].routingPreference,'TRAFFIC_AWARE_OPTIMAL');
 assert.equal(result.estimatedTravelTimeMins,16);assert.equal(result.distanceKm,8.78);assert.equal(result.departureTime,departure);
});
test('past departures use current traffic and preserve the requested timestamp',async()=>{
 const x=setup(),before=Date.now();const result=await x.get(1,2,3,4,{departureTime:'2000-01-01T00:00:00Z'});
 assert.ok(+new Date(result.departureTime)>=before);assert.equal(result.requestedDepartureTime,'2000-01-01T00:00:00.000Z');
});
test('invalid departure is rejected before making an API request',async()=>{
 const x=setup();await assert.rejects(x.get(1,2,3,4,{departureTime:'invalid'}),/Invalid routing/);assert.equal(x.calls.length,0);
});
