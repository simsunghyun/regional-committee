import {firebaseConfig} from './firebase-config.js';

const admin = document.body.classList.contains('admin-body');

const target = document.querySelector(admin ? '#status' : '#access-panel');

try {

  if (!firebaseConfig.projectId || !firebaseConfig.apiKey || !firebaseConfig.appId || !firebaseConfig.authDomain)

    throw Error('위원 전용 Firebase 설정을 입력한 뒤 이용할 수 있습니다.');

  if (firebaseConfig.projectId === 'regional-projects' || firebaseConfig.authDomain === 'regional-projects.firebaseapp.com')

    throw Error('위원 전용 홈페이지에는 별도 Firebase 프로젝트가 필요합니다.');

  await import(admin ? './admin.js' : './access.js?v=design1');

} catch (error) {

  target.textContent = error.message;

  if(admin) document.querySelector('#login').disabled=true;

}




