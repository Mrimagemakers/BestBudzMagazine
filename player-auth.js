import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const supabase=createClient('https://ycqepakoonxcayhhmssv.supabase.co','sb_publishable_-YxsXH0oEaa5Jq6mVlUEWQ_jIiWXGxe',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
export async function requirePlayer(){
 const gate=$('#loginGate'),status=$('#loginStatus'),form=$('#loginForm');
 const render=async()=>{const {data:{user}}=await supabase.auth.getUser();if(user?.email_confirmed_at){gate.hidden=true;return user}gate.hidden=false;return null};
 let user=await render();if(user)return user;
 return new Promise(resolve=>{
  let busy=false;
  form.addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;
   const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value,mode=e.submitter?.value||'signin';
   status.textContent='Checking account…';
   try{const {data,error}=mode==='signup'?await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await supabase.auth.signInWithPassword({email,password});if(error)throw error;
    if(mode==='signup'){status.textContent='Check your email to verify your address, then sign in. Do not share your password.';}
    else if(data.user?.email_confirmed_at){gate.hidden=true;resolve(data.user)}
    else{await supabase.auth.signOut();status.textContent='Please verify your email before signing in.';}
   }catch(err){status.textContent=err.message||'Sign-in failed.'}finally{busy=false}
  });
  supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user?.email_confirmed_at){gate.hidden=true;resolve(session.user)}});
 });
}
export async function profileEditor(){
 const {data:{user}}=await supabase.auth.getUser();if(!user)return;
 let {data:profile,error}=await supabase.from('player_profiles').select('*').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 const panel=$('#panelBody');panel.replaceChildren();
 const title=document.createElement('h2');title.textContent='My saved player profile';panel.append(title);
 const email=document.createElement('p');email.textContent=user.email;panel.append(email);
 const form=document.createElement('form');form.innerHTML='<label>Display name<input name="display_name" maxlength="40" required></label><label>Avatar style<select name="avatar_style"><option value="classic">Classic</option><option value="streetwear">Streetwear</option><option value="futuristic">Futuristic</option><option value="casual">Casual</option></select></label><label>Avatar color<input type="color" name="avatar_color"></label><label>Starter home<select name="starter_home"><option value="luxury_loft">Luxury loft</option><option value="rundown_house">Rundown house</option><option value="beach_house">Coastal beach house</option><option value="gamer_paradise">Gamer paradise</option><option value="forest_cabin">Cabin in the woods</option></select></label><button type="submit">Save profile</button><p id="profileStatus" role="status"></p>';
 panel.append(form);
 for(const name of ['display_name','avatar_style','avatar_color','starter_home'])form.elements[name].value=profile?.[name]||({display_name:'Explorer',avatar_style:'classic',avatar_color:'#66aa88',starter_home:'luxury_loft'}[name]);
 form.onsubmit=async e=>{e.preventDefault();const values={user_id:user.id,display_name:form.elements.display_name.value.trim(),avatar_style:form.elements.avatar_style.value,avatar_color:form.elements.avatar_color.value,starter_home:form.elements.starter_home.value,updated_at:new Date().toISOString()};const {error}=await supabase.from('player_profiles').upsert(values,{onConflict:'user_id'});form.querySelector('#profileStatus').textContent=error?'Save failed: '+error.message:'Profile saved to your account.'};
 const logout=document.createElement('button');logout.type='button';logout.textContent='Sign out';logout.onclick=async()=>{await supabase.auth.signOut();sessionStorage.removeItem('bb-age');location.reload()};panel.append(logout);
 const note=document.createElement('p');note.textContent='Your home and avatar preferences are saved. 3D avatar/home rendering is being developed.';panel.append(note);
}
