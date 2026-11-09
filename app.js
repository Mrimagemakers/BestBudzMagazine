import {requirePlayer,profileEditor} from './player-auth.js';
import {isAdult,validRoom} from './logic.js';
import {SHOPS,MARKET_CONFIG,JURISDICTIONS} from './marketplace-data.js';
import {HOMES} from './homes.js';
const $=s=>document.querySelector(s);
const places=[
['Market','Independent makers','Browse the culture shop. Brand partnerships and maker catalogs are editorial placeholders; no purchases are available.',0xbdb18b],
['Lounge','Make yourself at home','A place to meet. Open Group session to share a room with friends when the community server is configured.',0x9fac77],
['Coffee shop','Slow down, stay curious','The reading table: thoughtful conversations, fresh perspectives and a virtual coffee. Select the editorial room for source material.',0xc88d60],
['Music venue','Sound & community','An open stage for future licensed artist performances. Preview a quiet synthesized ambient tone below.',0x9c8db6],
['Cinema','Stories worth seeing','The screening room is ready for licensed films and creator conversations. No third-party films are embedded without permission.',0x6b9eaa],
['Editorial / politics','Independent perspectives','Explore the evidence, ask better questions, and distinguish opinion from reporting. Laws vary by jurisdiction; consult official local sources.',0xa6b4c1],
['Strain library','Curiosity, with context','Explore illustrative cultivar labels. A name or photograph cannot establish cannabinoid content, safety, or clinical benefit.',0xadd78a]];
let current=0,world, socket, audio, shareHash='place=0';
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source='https://www.nccih.nih.gov/health/cannabis-marijuana-and-cannabinoids-what-you-need-to-know';
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',4500)}
function show(html){$('#panelBody').innerHTML=html;$('#panel').hidden=false;$('#closePanel').focus()}
function visit(i){current=i;shareHash='place='+i;world?.visit(i);const p=places[i];show('<span class="eyebrow">DESTINATION / 0'+(i+1)+'</span><h2>'+p[0]+'</h2><h3>'+p[1]+'</h3><p>'+p[2]+'</p>');const enterButton=document.createElement('button');enterButton.textContent='Go inside '+p[0];enterButton.onclick=()=>{world?.enter(i);$('#panel').hidden=true};$('#panelBody').append(enterButton);if(i===6)library();if(i===3){const b=document.createElement('button');b.textContent='Play / stop ambient preview';b.onclick=()=>{if(audio){audio.close();audio=null;return}audio=new AudioContext();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=110;g.gain.value=.025;o.connect(g).connect(audio.destination);o.start()};$('#panelBody').append(b)}if(i===5)$('#panelBody').insertAdjacentHTML('beforeend','<article><h3>Evidence desk</h3><p>Clinical evidence concerns specific formulations and conditions, not marketing strain names.</p><a target="_blank" rel="noopener" href="'+source+'">Read NCCIH: cannabis and cannabinoids ↗</a></article>');send({type:'move',place:i})}
function library(){for(const name of ['Blue Dream','Sour Diesel','Granddaddy Purple']){const a=document.createElement('article');a.innerHTML='<h3>'+name+'</h3><small>ILLUSTRATIVE CULTIVAR LABEL · BATCH UNVERIFIED</small><p>THC, CBD, terpenes and origin: unknown without a batch-specific laboratory report. Reported effects are anecdotal and do not establish medical benefits.</p><p class="fine">Research on cannabinoids cannot be assumed to apply to this cultivar. Cannabis can impair attention and coordination and carries health risks. Avoid driving; discuss medical use with a qualified clinician.</p><a target="_blank" rel="noopener" href="'+source+'">Evidence & limitations: NCCIH ↗</a>';$('#panelBody').append(a)}}
// ---------------- Budz Marketplace ----------------
const toWorld=()=>$('#viewport').scrollIntoView({behavior:'smooth',block:'center'});
function button(text,fn,cls=''){const b=document.createElement('button');b.textContent=text;if(cls)b.className=cls;b.onclick=fn;return b}
function showShop(si,{travel=false}={}){
  const shop=SHOPS[si];shareHash='shop='+si;if(travel){world?.visitShop(si);toWorld()}
  show('<span class="eyebrow">BUDZ MARKETPLACE / '+String(si+1).padStart(2,'0')+'</span><h2>'+esc(shop.name)+'</h2><h3>'+esc(shop.tagline)+'</h3><p>'+esc(shop.about)+'</p>');
  const body=$('#panelBody');
  body.append(button('Go inside '+shop.name,()=>{world?.enterShop(si);$('#panel').hidden=true;toWorld()}));
  const list=document.createElement('div');list.className='products';
  shop.products.forEach((p,pi)=>list.append(button(p.name,()=>{world?.enterShop(si);world?.focusProduct(si,pi);showProduct(si,pi);toWorld()},'product')));
  body.insertAdjacentHTML('beforeend','<h3 class="sub">On display</h3>');body.append(list);
  if(shop.link==='retailer')retailers(body);
  send({type:'visit',district:'market',shop:si});
}
function showProduct(si,pi){
  const shop=SHOPS[si],p=shop.products[pi];shareHash='shop='+si;
  show('<span class="eyebrow">'+esc(shop.name.toUpperCase())+' · '+esc(p.category.toUpperCase())+'</span><h2>'+esc(p.name)+'</h2><p>'+esc(p.blurb)+'</p><ul class="facts">'+p.details.map(d=>'<li>'+esc(d)+'</li>').join('')+'</ul>');
  const body=$('#panelBody');
  if(shop.link==='retailer'){body.insertAdjacentHTML('beforeend','<p class="fine">Educational display only. Nothing is sold in Best Budz World. Cannabis is for adults 21+ where legal; do not drive after use. Discuss medical questions with a clinician.</p>');retailers(body)}
  else if(MARKET_CONFIG.shopUrl){const a=document.createElement('a');a.href=MARKET_CONFIG.shopUrl;a.target='_blank';a.rel='noopener';a.className='cta';a.textContent='View in the Best Budz store ↗';body.append(a)}
  else body.insertAdjacentHTML('beforeend','<p class="soon">Store link coming soon.</p>');
  body.append(button('← Back to '+shop.name,()=>showShop(si),'ghost'));
}
// Authorized retailer links appear only for a matching, verified jurisdiction.
function retailers(body){
  const saved=sessionStorage.getItem('bb-jurisdiction')||'';
  const box=document.createElement('article');box.className='retail';
  box.innerHTML='<h3>Find an authorized retailer</h3><p class="fine">Links appear only where adult-use or medical cannabis retail is legal and the retailer is a licensed Best Budz partner. Laws change; your state regulator is the authority. Transporting cannabis across state lines is illegal.</p><label>Where are you?<select id="jurisdiction"><option value="">Choose a state or region</option>'+JURISDICTIONS.map(j=>'<option'+(j===saved?' selected':'')+'>'+esc(j)+'</option>').join('')+'</select></label><div id="retailList" role="status"></div>';
  body.append(box);
  const render=()=>{const j=$('#jurisdiction').value;sessionStorage.setItem('bb-jurisdiction',j);const out=$('#retailList');if(!j){out.innerHTML='';return}
    const list=MARKET_CONFIG.retailers.filter(r=>r.verified===true&&r.jurisdiction===j&&/^https:\/\//.test(r.url));
    out.innerHTML=list.length?list.map(r=>'<a target="_blank" rel="noopener nofollow" href="'+esc(r.url)+'">'+esc(r.name)+' ↗</a><small>License '+esc(r.license||'on file')+'</small>').join(''):'<p>No authorized retail partners are listed for '+esc(j)+' yet. Check your state cannabis regulator for licensed retailers.</p>'};
  $('#jurisdiction').onchange=render;render();
}
function renderDistricts(){
  $('#districtNav').innerHTML='<button data-district="plaza"><small>DISTRICT 01</small>Central Plaza ↗</button><button data-district="market"><small>DISTRICT 02</small>Budz Marketplace ↗</button>'+SHOPS.map((s,i)=>'<button data-shop="'+i+'" class="shopbtn"><small>MARKETPLACE / 0'+(i+1)+'</small>'+esc(s.name)+' ↗</button>').join('');
  $('#districtNav').onclick=e=>{const d=e.target.closest('[data-district]'),sb=e.target.closest('[data-shop]');if(d){world?.goDistrict(d.dataset.district);shareHash='district='+d.dataset.district;toWorld()}if(sb){showShop(+sb.dataset.shop,{travel:true})}};
}
renderDistricts();
const hooks={onProduct:showProduct,onShop:si=>showShop(si),onDistrict:d=>{$('#worldStatus').textContent=d==='market'?'BUDZ MARKETPLACE · 5 storefronts · tap any display to learn more':'CENTRAL PLAZA · 7 venues · Marketplace through the north gateways';send({type:'visit',district:d,shop:-1})}};
$('#places').innerHTML=places.map((p,i)=>'<button data-place="'+i+'"><small>0'+(i+1)+' / EXPLORE</small>'+p[0]+' ↗</button>').join('');
const homeSection=document.createElement('section');homeSection.className='destinations home-selector';homeSection.innerHTML='<span class="eyebrow">YOUR PERSONAL SPACE</span><h2>Choose your home</h2><p>Enter one of five furnished 3D interiors. Save your preferred starter home in Account.</p><nav id="homesList">'+HOMES.map(h=>'<button type="button" data-home="'+h.id+'">'+h.name+' ↗</button>').join('')+'</nav>';
$('#places').closest('.destinations').after(homeSection);
function homeMediaPanel(h){
 show('<span class="eyebrow">YOUR HOME / ENTERTAINMENT</span><h2>'+h.name+'</h2><p>Welcome home. Use the entertainment controls below, or close this panel to explore your 3D room.</p><div class="mediaActions"><a href="https://turnupmusic.online" target="_blank" rel="noopener noreferrer">♫ Turn Up Music Radio ↗</a><a href="https://www.plex.tv/watch-free-tv/" target="_blank" rel="noopener noreferrer">▣ Free live TV ↗</a><a href="https://www.pluto.tv/" target="_blank" rel="noopener noreferrer">▣ Pluto TV genres ↗</a></div><p class="fine">Media opens in a new tab. In-world streaming and channel selection are not yet implemented.</p>');
}
homeSection.addEventListener('click',e=>{const b=e.target.closest('[data-home]');if(!b)return;const h=world?.enterHome(b.dataset.home);if(h){$('#viewport').scrollIntoView({block:'start',behavior:'smooth'});homeMediaPanel(h)}});

const controlsSection=document.createElement('section');controlsSection.className='destinations controls-settings';controlsSection.innerHTML='<span class="eyebrow">GAMEPLAY SETTINGS</span><h2>Navigation controls</h2><p>Xbox / PlayStation: left stick to move, right stick to look, A / Cross to interact, B / Circle to close panels. Keyboard: WASD to walk, drag to look.</p><label for="lookSensitivity">Look sensitivity <output id="sensitivityValue">1.0×</output></label><input id="lookSensitivity" type="range" min="0.3" max="2.5" step="0.1"><label class="check"><input id="invertLook" type="checkbox"> Invert vertical look</label><button id="resetControls" type="button">Restore defaults</button>';
homeSection.after(controlsSection);
controlsSection.insertAdjacentHTML('beforeend','<label for="avatarColor">Avatar outfit color</label><input id="avatarColor" type="color" value="'+(localStorage.getItem('bb-avatar-color')||'#64bfa4')+'"><p class="fine">Change the color of your local 3D avatar. More customization options are coming.</p>');
$('#avatarColor').addEventListener('input',e=>{localStorage.setItem('bb-avatar-color',e.target.value);world?.setAvatarColor(e.target.value)});
const sensitivityInput=$('#lookSensitivity'),invertInput=$('#invertLook'),sensitivityValue=$('#sensitivityValue');
sensitivityInput.value=localStorage.getItem('bb-look-sensitivity')||'1';
invertInput.checked=localStorage.getItem('bb-invert-look')==='true';
function applyLook(){const value=Number(sensitivityInput.value);sensitivityValue.textContent=value.toFixed(1)+'×';localStorage.setItem('bb-look-sensitivity',String(value));localStorage.setItem('bb-invert-look',String(invertInput.checked));world?.setLookSettings(value,invertInput.checked)}
sensitivityInput.addEventListener('input',applyLook);invertInput.addEventListener('change',applyLook);
$('#resetControls').onclick=()=>{sensitivityInput.value='1';invertInput.checked=false;applyLook()};
applyLook();
$('#exploreMenu').onclick=()=>document.querySelector('.home-selector')?.scrollIntoView({behavior:'smooth',block:'start'});
$('#places').onclick=e=>{const b=e.target.closest('[data-place]');if(b)visit(+b.dataset.place)};
$('#closePanel').onclick=()=>$('#panel').hidden=true;
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#panel').hidden=true});
$('#exit').onclick=()=>{sessionStorage.removeItem('bb-age');location.reload()};
$('#ageForm').onsubmit=e=>{e.preventDefault();if(!isAdult($('#dob').value)||!$('#attest').checked){$('#ageError').textContent='Entry requires confirmation that you are at least 21.';return}sessionStorage.setItem('bb-age','yes');enter().then(openSharedPlace)};
async function enter(){$('#gate').hidden=true;$('#app').hidden=false;if(!world){try{const m=await import('./world.js?v=districts-9');world=await m.init($('#viewport'),places,visit,hooks);$('#worldStatus').textContent='2 DISTRICTS · '+(7+world.stats.shops)+' OPEN INTERIORS · '+world.stats.npcs+' NPCs · TRANSIT RING AHEAD-LEFT'}catch(e){$('#worldStatus').textContent='3D unavailable. Explore all destinations using the buttons below.';console.error(e)}}}
$('#home').onclick=()=>world?.reset();
document.querySelector('#arOverlay').addEventListener('click',e=>{const b=e.target.closest('[data-ar]');if(b)world?.ar?.[b.dataset.ar]?.()});
$('#share').onclick=async()=>{const url=new URL(location.href);url.search='';url.hash=shareHash;try{if(navigator.share)await navigator.share({title:'Best Budz World',url:url.href});else{await navigator.clipboard.writeText(url.href);toast('Destination link copied')}}catch{toast('Sharing unavailable. Copy this page address to share.')}};
const config=await fetch('./config.json').then(r=>r.json()).catch(()=>({}));
const api=config.apiBase?new URL(config.apiBase):null;
if(api&&api.protocol!=='https:'&&api.hostname!=='localhost')throw Error('Community API must use HTTPS');
function send(data){if(socket?.readyState===1)socket.send(JSON.stringify(data))}
$('#account').onclick=async()=>{show('<h2>Player profile</h2><p>Loading saved profile…</p>');try{await profileEditor()}catch(e){$('#panelBody').textContent='Profile unavailable: '+e.message}};
/* Legacy community panel retained below for later integration. */
function legacyAccountPanel(){show('<span class="eyebrow">YOUR COMMUNITY</span><h2>Keep in touch.</h2><p>The 21+ entry is a self-attestation. Verifying an inbox does not verify your age.</p><form id="emailForm"><label>Email address<input type="email" id="email" required autocomplete="email"></label><button '+(!api?'disabled':'')+'>Send verification email</button></form><p id="emailStatus" role="status">'+(!api?'Email service is not configured. No address will be collected.':'A single-use link will be sent to your inbox.')+'</p><h2>Group session</h2><p>Share a room code with friends. Presence and text chat require the community server. Messages are ephemeral; do not share private information.</p><form id="roomForm"><label>Room code<input id="room" required pattern="[a-zA-Z0-9-]{3,40}" maxlength="40" value="best-budz"></label><button '+(!api?'disabled':'')+'>Join group</button></form><p id="roomStatus" role="status">'+(!api?'Remote groups are unavailable until a server is configured.':'Not connected')+'</p><ul id="messages"></ul><form id="chatForm" hidden><label>Message<input id="message" maxlength="300" required></label><button>Send</button><button type="button" id="leave">Leave group</button></form>');
$('#emailForm').onsubmit=async e=>{e.preventDefault();try{const r=await fetch(new URL('verify/request',api),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#email').value})});$('#emailStatus').textContent=r.ok?'Check your inbox for a verification link.':'Email could not be sent. Try again later.'}catch{$('#emailStatus').textContent='Email service unavailable.'}};
$('#roomForm').onsubmit=e=>{e.preventDefault();const room=$('#room').value;if(!validRoom(room))return;socket?.close();const u=new URL('groups',api);u.protocol=u.protocol==='https:'?'wss:':'ws:';u.searchParams.set('room',room);socket=new WebSocket(u);socket.onopen=()=>{$('#roomStatus').textContent='Connected to '+room;$('#chatForm').hidden=false;send({type:'move',place:current})};socket.onclose=()=>{if($('#roomStatus'))$('#roomStatus').textContent='Disconnected';if($('#chatForm'))$('#chatForm').hidden=true};socket.onerror=()=>toast('Group connection failed');socket.onmessage=e=>{try{const m=JSON.parse(e.data);if(!$('#messages'))return;const li=document.createElement('li');li.textContent=m.type==='presence'?m.count+' visitors in this room':m.type==='move'?m.id+' is visiting '+places[m.place][0]:m.type==='visit'?m.id+' is in '+(m.district==='market'?(m.shop>=0?'Budz Marketplace · '+SHOPS[m.shop].name:'Budz Marketplace'):'Central Plaza'):m.id+': '+m.text;$('#messages').append(li);while($('#messages').children.length>30)$('#messages').firstChild.remove()}catch{}}};
$('#chatForm').onsubmit=e=>{e.preventDefault();send({type:'chat',text:$('#message').value});$('#message').value=''};$('#leave').onclick=()=>socket?.close()};
$('#gate').hidden=true;
await requirePlayer();
$('#gate').hidden=sessionStorage.getItem('bb-age')==='yes';
if(sessionStorage.getItem('bb-age')==='yes')await enter();
function openSharedPlace(){if(sessionStorage.getItem('bb-age')!=='yes')return;const h=location.hash;let m;if((m=h.match(/^#place=([0-6])$/)))visit(+m[1]);else if((m=h.match(/^#shop=([0-9])$/))&&SHOPS[+m[1]])showShop(+m[1],{travel:true});else if((m=h.match(/^#district=(plaza|market)$/))){world?.goDistrict(m[1]);shareHash='district='+m[1]}}
openSharedPlace();
window.addEventListener('hashchange',openSharedPlace);
