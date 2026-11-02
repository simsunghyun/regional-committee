import {auth,db,doc,login,signOut,isOwner,isAllowed,onAuthStateChanged,onSnapshot,readJSON,errorText} from './firebase-client.js?v=committee1';
let running=false,version=0,stopWatch=()=>{};
const panel=document.querySelector('#access-panel');
function screen(title,message,user){document.body.classList.add('locked');panel.hidden=false;panel.replaceChildren();const card=document.createElement('div');card.className='login-card';const logo=document.createElement('img');logo.src='committee-logo.svg';logo.alt='지방시대위원회';const h=document.createElement('h1');h.textContent=title;const p=document.createElement('p');p.textContent=message;const button=document.createElement('button');button.className='primary';button.textContent=user?'다른 계정으로 로그인':'Google 계정으로 로그인';button.onclick=async()=>{button.disabled=true;try{if(user){await signOut(auth);return;}await login();}catch(e){p.textContent=errorText(e);}finally{button.disabled=false;}};card.append(logo,h,p,button);if(user){const retry=document.createElement('button');retry.textContent='다시 연결';retry.onclick=()=>location.reload();card.append(retry);}if(isOwner(user)){const admin=document.createElement('a');admin.href='admin.html';admin.textContent='이용자·자료 관리';card.append(admin);}panel.append(card);}
const expires=Date.parse('2026-11-02T20:00:00+09:00');
async function circulation(token){
 const expired=()=>Date.now()>=expires;
 const close=()=>{document.body.classList.add('locked');location.reload();};
 try{
  const [data,cfg,module]=await Promise.all([readJSON('data/results.js'),fetch('dashboard-config.json').then(r=>{if(!r.ok)throw Error();return r.json();}),import('./dashboard-app.js?v=overview3')]);
  if(token!==version)return;
  if(expired())return close();
  module.start(data,cfg);running=true;panel.hidden=true;document.body.classList.remove('locked');
  document.querySelector('#account').textContent='임시 회람 · 11월 2일 한국시간 20:00 종료';
  setTimeout(close,Math.max(0,expires-Date.now()));
  for(const event of ['focus','pageshow','visibilitychange'])window.addEventListener(event,()=>{if(expired())close();});
 }catch{
  if(token===version)screen('권역별 발전계획','임시 회람 자료를 열 수 없습니다. 승인된 Google 계정으로 로그인해 주세요.');
 }
}
onAuthStateChanged(auth,async user=>{
 const token=++version;stopWatch();if(running){location.reload();return;}
 if(!user && Date.now()<expires){await circulation(token);return;}
 if(!user){screen('권역별 발전계획','등록된 Google 계정으로 로그인해 주세요. 카카오톡 등 앱 안에서 열었다면 Safari 또는 Chrome에서 다시 열어 주세요.');return;}
 try{
  if(!await isAllowed(user)){screen('등록되지 않은 계정입니다',user.email+' 계정의 이용 등록을 관리자에게 요청해 주세요.',user);return;}
  screen('자료를 불러오고 있습니다','위원 열람용 분석 대시보드를 준비하고 있습니다.',user);
  const [data,config,module]=await Promise.all([readJSON('data/results.js'),fetch('dashboard-config.json').then(r=>{if(!r.ok)throw Error('설정 파일을 읽지 못했습니다.');return r.json();}),import('./dashboard-app.js?v=overview3')]);
  if(token!==version)return;
  module.start(data,config);running=true;document.body.classList.remove('locked');panel.hidden=true;
  const account=document.querySelector('#account'),email=document.createElement('span'),out=document.createElement('button');email.textContent=user.email;out.textContent='로그아웃';out.onclick=()=>signOut(auth);account.replaceChildren(email,out);
  if(isOwner(user)){const a=document.createElement('a');a.href='admin.html';a.textContent='관리';account.append(a);}else{
   stopWatch=onSnapshot(doc(db,'allowedUsers',user.email),{includeMetadataChanges:true},snapshot=>{if(!snapshot.metadata.fromCache&&snapshot.data()?.enabled!==true){screen('이용 권한이 해제되었습니다','관리자에게 이용 등록을 확인해 주세요.',user);}},error=>{screen('자료 연결을 확인해 주세요',errorText(error),user);});
  }
 }catch(error){if(token===version)screen('자료 연결을 확인해 주세요',errorText(error),user);}
});

