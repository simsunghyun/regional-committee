import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserSessionPersistence, onAuthStateChanged, signOut} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, getDocsFromServer, collection, setDoc, deleteDoc, writeBatch, serverTimestamp, onSnapshot} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import {firebaseConfig, OWNER_EMAIL} from './firebase-config.js';
import {fileId, fromBase64, parseData, digest} from './private-format.js';
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export {OWNER_EMAIL, doc, getDocFromServer, getDocsFromServer, collection, setDoc, deleteDoc, writeBatch, serverTimestamp, onSnapshot, onAuthStateChanged, signOut};
const ready = setPersistence(auth, browserSessionPersistence);
export async function login() {await ready; const provider = new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});return signInWithPopup(auth, provider);}
export const isOwner = user => user?.email === OWNER_EMAIL && user?.emailVerified;
export async function isAllowed(user) {
  if (!user?.emailVerified) return false;
  const token = await user.getIdTokenResult();
  if (token.signInProvider !== 'google.com') return false;
  if (isOwner(user)) return true;
  return (await getDocFromServer(doc(db, 'allowedUsers', user.email))).data()?.enabled === true;
}
export async function readBytes(path) {
  const ref = doc(db, 'privateFiles', fileId(path));
  const meta = (await getDocFromServer(ref)).data();
  if (!meta || !Number.isInteger(meta.chunks) || meta.chunks < 1 || !meta.sha256) throw Error('관리자가 아직 자료를 등록하지 않았습니다.');
  const result = new Uint8Array(meta.size);
  let offset = 0;
  for (let n = 0; n < meta.chunks; n++) {
    const part = (await getDocFromServer(doc(ref, 'chunks', meta.sha256 + '-' + n))).data();
    if (!part?.body) throw Error('자료 일부를 읽지 못했습니다. 관리자에게 문의해 주세요.');
    const bytes = fromBase64(part.body);result.set(bytes, offset);offset += bytes.length;
  }
  if (offset !== meta.size || await digest(result) !== meta.sha256) throw Error('자료 무결성 확인에 실패했습니다. 다시 시도해 주세요.');
  return result;
}
export const readJSON = async path => parseData(new TextDecoder().decode(await readBytes(path)));
export function errorText(error) {
  const messages = {'auth/unauthorized-domain':'Firebase Authentication의 승인된 도메인에 simsunghyun.github.io를 추가해 주세요.', 'auth/operation-not-allowed':'Firebase Authentication에서 Google 로그인을 사용 설정해 주세요.', 'auth/popup-blocked':'브라우저에서 팝업을 허용한 뒤 다시 로그인해 주세요.', 'auth/popup-closed-by-user':'로그인이 취소되었습니다.', 'permission-denied':'접근 권한이 없거나 Firestore 보안 규칙이 아직 적용되지 않았습니다.', 'resource-exhausted':'무료 이용 한도에 도달했습니다. 나중에 다시 시도해 주세요.', 'unavailable':'서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.'};
  return messages[error.code] || error.message || '처리하지 못했습니다. 다시 시도해 주세요.';
}
