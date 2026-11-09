import http from 'node:http';
import crypto from 'node:crypto';
import {WebSocketServer} from 'ws';
import nodemailer from 'nodemailer';
import {consumeToken,validRoom,validVisit} from '../logic.js';
const origin=process.env.SITE_ORIGIN;
if(!origin||!process.env.SMTP_URL||!process.env.MAIL_FROM||!process.env.PUBLIC_API_URL)throw Error('Configure SITE_ORIGIN, SMTP_URL, MAIL_FROM and PUBLIC_API_URL');
const mail=nodemailer.createTransport(process.env.SMTP_URL),tokens=new Map(),rates=new Map();
function limited(key,max){const now=Date.now();let r=rates.get(key);if(!r||r.until<now){r={count:0,until:now+600000};rates.set(key,r)}return ++r.count>max}
setInterval(()=>{const now=Date.now();for(const [k,v]of tokens)if(v.expires<now)tokens.delete(k);for(const [k,v]of rates)if(v.until<now)rates.delete(k)},60000).unref();
const server=http.createServer(async(req,res)=>{
res.setHeader('Cache-Control','no-store');
if(req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')}
if(req.method==='OPTIONS'){res.writeHead(req.headers.origin===origin?204:403);return res.end()}
const url=new URL(req.url,'http://localhost');
if(req.method==='GET'&&url.pathname==='/verify/confirm'){const email=consumeToken(tokens,url.searchParams.get('token'));res.writeHead(email?200:400,{'Content-Type':'text/plain; charset=utf-8','Referrer-Policy':'no-referrer'});return res.end(email?'Inbox control confirmed. This does not verify age or create an authenticated account. Return to Best Budz World.':'Link expired or already used. Request a new link.')}
if(req.method!=='POST'||url.pathname!=='/verify/request'){res.writeHead(404);return res.end()}
if(req.headers.origin!==origin){res.writeHead(403);return res.end()}
if(limited(req.socket.remoteAddress,5)){res.writeHead(429);return res.end()}
try{let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.writeHead(413);return res.end()}}
const {email}=JSON.parse(body);if(typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email)){res.writeHead(400);return res.end()}
if(limited('mail:'+email.toLowerCase(),3)){res.writeHead(429);return res.end()}
const token=crypto.randomBytes(32).toString('hex');tokens.set(token,{email,expires:Date.now()+900000});
const link=new URL('/verify/confirm',process.env.PUBLIC_API_URL);link.searchParams.set('token',token);
try{await mail.sendMail({from:process.env.MAIL_FROM,to:email,subject:'Confirm your Best Budz World email',text:'Confirm inbox control (expires in 15 minutes): '+link.href+'\nThis does not verify your age or identity.'})}catch(e){tokens.delete(token);throw e}
res.writeHead(202);res.end()
}catch{res.writeHead(503);res.end('Verification unavailable')}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048}),rooms=new Map();
server.on('upgrade',(req,socket,head)=>{const u=new URL(req.url,'http://localhost'),room=u.searchParams.get('room');if(req.headers.origin!==origin||u.pathname!=='/groups'||!validRoom(room)||(rooms.get(room)?.size||0)>=16||wss.clients.size>=200||limited('ws:'+req.socket.remoteAddress,30)){socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,room))});
wss.on('connection',(ws,room)=>{let members=rooms.get(room);if(!members){members=new Set();rooms.set(room,members)}members.add(ws);const id=crypto.randomBytes(3).toString('hex');let last=0;ws.alive=true;ws.on('pong',()=>ws.alive=true);
const broadcast=m=>{for(const peer of members)if(peer.readyState===1&&peer.bufferedAmount<64000)peer.send(JSON.stringify(m))};
broadcast({type:'presence',count:members.size});ws.on('message',data=>{if(Date.now()-last<250)return;last=Date.now();try{const m=JSON.parse(data);if(m.type==='chat'&&typeof m.text==='string'&&m.text.trim()&&m.text.length<=300)broadcast({type:'chat',id,text:m.text.trim()});if(m.type==='move'&&Number.isInteger(m.place)&&m.place>=0&&m.place<=6)broadcast({type:'move',id,place:m.place});if(m.type==='visit'&&validVisit(m))broadcast({type:'visit',id,district:m.district,shop:m.shop})}catch{}});
ws.on('error',()=>{});ws.on('close',()=>{members.delete(ws);broadcast({type:'presence',count:members.size});if(!members.size)rooms.delete(room)})});
setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue}ws.alive=false;ws.ping()}},30000).unref();
server.listen(process.env.PORT||8080);
