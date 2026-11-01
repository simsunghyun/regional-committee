import {auth, db, OWNER_EMAIL, doc, collection, getDocFromServer, getDocsFromServer, setDoc, deleteDoc, writeBatch, serverTimestamp, onAuthStateChanged, login, signOut, isAllowed, isOwner, errorText} from './firebase-client.js?v=committee1';
import {CHUNK_SIZE,fileId,toBase64,digest} from './private-format.js';
const $=id=>document.getElementById(id);
const status=message=>{$('status').textContent=message;};
let selected=[],busy=false;
$('login').onclick=async()=>{try{await login();}catch(e){status(errorText(e));}};
$('logout').onclick=()=>signOut(auth);
onAuthStateChanged(auth,async user=>{
  $('admin-tools').hidden=true;$('logout').hidden=!user;$('login').hidden=!!user;
  $('account').textContent=user?user.email:'관리자 Google 계정으로 로그인해 주세요.';
  if(!user)return;
  try{if(!isOwner(user)||!await isAllowed(user)){status('이 화면은 관리자만 이용할 수 있습니다.');return;}
    await refreshUsers();$('admin-tools').hidden=false;status('관리자 계정으로 로그인했습니다.');
  }catch(e){status(errorText(e));}
});
async function refreshUsers(){
  const docs=await getDocsFromServer(collection(db,'allowedUsers'));$('users').replaceChildren();
  if(docs.empty){const p=document.createElement('p');p.textContent='등록된 이용자가 없습니다. 관리자 본인은 별도 등록 없이 이용할 수 있습니다.';$('users').append(p);}
  docs.forEach(snapshot=>{const li=document.createElement('li'),span=document.createElement('span'),button=document.createElement('button');
    span.textContent=snapshot.id+(snapshot.data().enabled?' · 이용 가능':' · 이용 중지');button.textContent='등록 삭제';
    button.onclick=async()=>{if(!confirm(snapshot.id+' 계정의 이용 권한을 삭제할까요?'))return;button.disabled=true;try{await deleteDoc(doc(db,'allowedUsers',snapshot.id));await refreshUsers();status('이용 권한을 삭제했습니다.');}catch(e){status(errorText(e));button.disabled=false;}};li.append(span,button);$('users').append(li);
  });
}
$('user-form').onsubmit=async event=>{event.preventDefault();const email=$('email').value.trim().toLowerCase();
  if(email===OWNER_EMAIL){status('관리자 계정은 이미 이용 가능합니다.');return;}
  const button=event.submitter;button.disabled=true;
  try{await setDoc(doc(db,'allowedUsers',email),{enabled:true,updatedAt:serverTimestamp()});$('email').value='';await refreshUsers();status(email+' 계정을 등록했습니다.');}catch(e){status(errorText(e));}finally{button.disabled=false;}
};
$('files').onchange=()=>{selected=Array.from($('files').files);$('selection').textContent=selected.length+'개 파일 선택';$('upload').disabled=!selected.length;};
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
$('upload').onclick=async()=>{
  busy=true;$('upload').disabled=true;$('files').disabled=true;$('logout').disabled=true;let completed=0,skipped=0;
  const note=message=>{$('upload-status').textContent=message;};
  try{
    if(!isOwner(auth.currentUser)||!await isAllowed(auth.currentUser))throw Error('관리자 로그인이 필요합니다.');
    const files=new Map(selected.map(file=>[file.webkitRelativePath.split('/').slice(1).join('/'),file]));
    const manifestFile=files.get('manifest.json');if(!manifestFile)throw Error('manifest.json이 들어 있는 위원대시보드자료 폴더를 선택해 주세요.');
    const manifest=JSON.parse(await manifestFile.text());
    if(manifest.format!==1||!Array.isArray(manifest.files)||manifest.files.length!==1)throw Error('자료 목록 형식이 올바르지 않습니다.');
    for(const item of manifest.files){if(item.path!=='data/results.js'||!files.has(item.path)||files.get(item.path).size!==item.size)throw Error('자료 누락 또는 크기 불일치: '+item.path);}
    $('progress').max=manifest.files.length;$('progress').value=0;
    // Preflight all hashes before any writes so a damaged package is not partially imported.
    for(let n=0;n<manifest.files.length;n++){const item=manifest.files[n];note('자료 검사 중 '+(n+1)+' / '+manifest.files.length);if(await digest(await files.get(item.path).arrayBuffer())!==item.sha256)throw Error('파일 검사 실패: '+item.path);}
    // Global index files last: first-time users cannot start before project files are registered.
    const ordered=[...manifest.files].sort((a,b)=>(a.path==='data/results.js'?1:0)-(b.path==='data/results.js'?1:0));
    for(const item of ordered){
      note('등록 중 '+(completed+1)+' / '+ordered.length+'\n'+item.path+'\n이미 등록된 파일 '+skipped+'개');
      const ref=doc(db,'privateFiles',fileId(item.path));const old=(await getDocFromServer(ref)).data();
      if(old?.sha256===item.sha256&&old?.size===item.size){skipped++;completed++;$('progress').value=completed;continue;}
      const bytes=new Uint8Array(await files.get(item.path).arrayBuffer());const chunks=Math.ceil(bytes.length/CHUNK_SIZE);
      for(let start=0;start<chunks;start+=4){const batch=writeBatch(db);for(let n=start;n<Math.min(start+4,chunks);n++){batch.set(doc(ref,'chunks',item.sha256+'-'+n),{body:toBase64(bytes.subarray(n*CHUNK_SIZE,(n+1)*CHUNK_SIZE))});}await batch.commit();}
      await setDoc(ref,{path:item.path,size:item.size,sha256:item.sha256,chunks,updatedAt:serverTimestamp()});
      completed++;$('progress').value=completed;
    }
    note('전체 '+completed+'개 등록 완료 (기존 파일 '+skipped+'개 포함). 위의 사업 조회로 돌아가 확인해 주세요.');
  }catch(e){note('등록 중단: '+errorText(e)+'\n완료 '+completed+'개. 문제 해결 후 같은 폴더로 다시 시도할 수 있습니다.');}
  finally{busy=false;$('upload').disabled=false;$('files').disabled=false;$('logout').disabled=false;}
};
