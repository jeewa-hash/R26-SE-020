const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const full=fs.readFileSync(path.join(__dirname,'../navigation/BottomTabNavigator.js'),'utf8');
const start=full.indexOf('export default function BottomTabNavigator()');
const end=full.indexOf('\n  return (\n    <View style={{ flex: 1 }}>',start);
const source=full.slice(start,end).replace('export default ','')+'\nreturn {};\n}\nthis.component=BottomTabNavigator;';
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
async function setup() {
 const state={auth:[{_id:'old',isRead:false,type:'quote',createdAt:'2000-01-01'}],admin:[],failAuth:false};
 const effects=[],values=[],socket={handlers:{},on(name,fn){this.handlers[name]=fn;},emit(){},disconnect(){}};let poll;
 const context={ThemeContext:{},LIGHT:{},DARK:{},API_URL:'https://auth.test',ADMIN_API_URL:'https://admin.test',Date,Set,Number,String,AbortController,setTimeout,clearTimeout,console,Alert:{alert(){}},clearAllAuthStorage:async()=>{},getStoredProviderAuth:async()=>({providerId:'provider',token:'token'}),subscribeProviderSession:()=>()=>{},useContext:()=>({isDark:false}),useNavigation:()=>({reset(){}}),useRef:value=>({current:value}),useState:value=>{const index=values.length;values.push(value);return [value,v=>{values[index]=typeof v==='function'?v(values[index]):v;}];},useEffect:fn=>effects.push(fn),io:()=>socket,setInterval:fn=>{poll=fn;return 1},clearInterval(){},fetch:async url=>{
 if(url==='https://auth.test/notifications'){if(state.failAuth)throw Error('auth offline');return {ok:true,json:async()=>state.auth};}
 if(url.includes('/provider-status/'))return {ok:true,json:async()=>({})};
 return {ok:true,json:async()=>({data:state.admin})};
 }};
 vm.runInNewContext(source,context);context.component();effects[0]();const cleanup=effects[1]();await flush();
 return {state,values,socket,poll:()=>poll(),cleanup,flush};
}
test('provider login does not replay backlog, live sockets ignore device clock, and duplicates remain quiet',async()=>{
 const x=await setup();assert.equal(x.values[0],null);
 const item={_id:'new',type:'quote',title:'New quotation request',isRead:false,createdAt:'2000-01-01'};
 x.socket.handlers.notification(item);assert.equal(x.values[0]._id,'new');
 x.values[0]=null;x.socket.handlers.new_notification(item);assert.equal(x.values[0],null);x.cleanup();
});
test('provider polling detects new requests but keeps the unread badge when auth is unavailable',async()=>{
 const x=await setup();x.state.auth=[{_id:'fresh',type:'quote',isRead:false},...x.state.auth];await x.poll();
 assert.equal(x.values[0]._id,'fresh');assert.equal(x.values[1],true);
 x.state.failAuth=true;await x.poll();assert.equal(x.values[1],true);x.cleanup();
});
test('late historical admin results seed quietly and later admin updates can show',async()=>{
 const x=await setup();x.state.admin=[{_id:'admin-new',type:'inquiry_approved',isRead:false}];await x.poll();
 assert.equal(x.values[0]._id,'admin-new');x.cleanup();
});
