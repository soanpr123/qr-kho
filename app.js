import QrScanner from './qr-scanner.min.js';
import {addCode,formatCodes,canAccept} from './model.mjs';
const $=id=>document.getElementById(id),items=new Map();let scanner,running=false,busy=false,timer;const gate={code:null,seen:0};
// v3: use a reusable media element, unlocked directly by a tap on iPhone.
let scanAudio, soundQueue=Promise.resolve(), focusTimer;
function getScanAudio(){
  if(scanAudio)return scanAudio;
  const rate=22050,count=Math.floor(rate*0.18),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+count*2,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  text(36,'data');view.setUint32(40,count*2,true);
  for(let i=0;i<count;i++){const envelope=Math.min(1,i/(rate*0.008),(count-i)/(rate*0.025));view.setInt16(44+i*2,Math.sin(2*Math.PI*1100*i/rate)*23000*envelope,true);}
  scanAudio=new Audio('data:audio/wav;base64,'+btoa(String.fromCharCode(...new Uint8Array(buffer))));
  scanAudio.preload='auto';scanAudio.volume=1;return scanAudio;
}
function soundError(){toast('Chạm “Thử tiếng bíp” để bật âm thanh, rồi tăng âm lượng điện thoại.');}
function prepareAudio(){
  // play() must run synchronously inside the user's tap, before camera permission awaits.
  try{const audio=getScanAudio();audio.currentTime=0;audio.play().catch(soundError);}catch{soundError();}
}
function beep(){
  soundQueue=soundQueue.then(async()=>{
    const audio=getScanAudio();audio.currentTime=0;
    await audio.play();
    await new Promise(resolve=>setTimeout(resolve,210));
  }).catch(soundError);
}
const guide=document.querySelector('.guide');
function resetFocus(){clearTimeout(focusTimer);guide.removeAttribute('style');}
function trackFocus(points){
  if(!points?.length)return;
  const video=$('video'),width=video.clientWidth,height=video.clientHeight;
  if(!video.videoWidth||!video.videoHeight||!width||!height)return;
  const scale=Math.max(width/video.videoWidth,height/video.videoHeight);
  const offsetX=(width-video.videoWidth*scale)/2,offsetY=(height-video.videoHeight*scale)/2;
  const mirrored=video.style.transform.includes('scaleX(-1)');
  const projected=points.map(p=>({x:mirrored?width-(p.x*scale+offsetX):p.x*scale+offsetX,y:p.y*scale+offsetY}));
  const left=Math.min(...projected.map(p=>p.x))-7,top=Math.min(...projected.map(p=>p.y))-7;
  const right=Math.max(...projected.map(p=>p.x))+7,bottom=Math.max(...projected.map(p=>p.y))+7;
  Object.assign(guide.style,{display:'block',inset:'auto',left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px',transition:'left 100ms linear, top 100ms linear, width 100ms linear, height 100ms linear'});
  clearTimeout(focusTimer);focusTimer=setTimeout(resetFocus,700);
}
const soundButton=document.createElement('button');soundButton.type='button';soundButton.className='secondary';soundButton.textContent='♫ Thử tiếng bíp';soundButton.style.marginTop='12px';soundButton.onclick=prepareAudio;
document.querySelector('.scan-controls').after(soundButton);
async function focusCamera(){
  try{
    const track=$('video').srcObject?.getVideoTracks()[0];
    if(track?.getCapabilities?.().focusMode?.includes('continuous'))
      await track.applyConstraints({advanced:[{focusMode:'continuous'}]});
  }catch{}
}
try{for(const [code,n] of JSON.parse(localStorage.getItem('qr-kho-v1')||'[]'))if(typeof code==='string'&&Number.isSafeInteger(n)&&n>0)items.set(code,n);}catch{}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function render(){let total=0;$('list').replaceChildren();for(const [code,n] of items){total+=n;const row=document.createElement('div');row.className='row';const label=document.createElement('span');label.className='code';label.textContent=code;const qty=document.createElement('div');qty.className='qty';const count=document.createElement('span');count.textContent=n;for(const [text,delta] of [['−',-1],['+',1]]){const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-label',`${delta>0?'Tăng':'Giảm'} số lượng ${code}`);b.onclick=()=>{const next=items.get(code)+delta;if(next<=0)items.delete(code);else items.set(code,next);render();};qty.append(b);if(delta<0)qty.append(count);}const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Xóa ${code}`);remove.onclick=()=>{items.delete(code);render();};qty.append(remove);row.append(label,qty);$('list').append(row);}if(!items.size)$('list').innerHTML='<div class="empty">▦<strong>Danh sách đang chờ mã đầu tiên</strong><p>Bật camera, tải ảnh hoặc nhập mã để bắt đầu.</p></div>';$('unique').textContent=items.size;$('total').textContent=total;$('output').value=formatCodes(items);$('copy').disabled=$('clear').disabled=!items.size;try{localStorage.setItem('qr-kho-v1',JSON.stringify([...items]));}catch{}}
function add(code){if(addCode(items,code)){render();toast(`Đã thêm ${code}`);beep();}}
$('form').onsubmit=e=>{e.preventDefault();const codes=$('manual').value.split(/[,\n\r]+/).filter(x=>x.trim());codes.forEach(code=>addCode(items,code));if(codes.length){render();$('manual').value='';toast(`Đã thêm ${codes.length} mã`);}};
function stop(){scanner?.stop();running=false;resetFocus();$('placeholder').hidden=false;$('camera').textContent='◎  Bật camera';$('state').textContent='Camera đang tắt';}
$('camera').onclick=async()=>{if(busy)return;if(running){stop();return;}prepareAudio();busy=true;$('camera').disabled=true;try{scanner??=new QrScanner($('video'),result=>{trackFocus(result.cornerPoints);if(canAccept(gate,result.data,Date.now())){add(result.data);navigator.vibrate?.(60);}},{preferredCamera:'environment',maxScansPerSecond:8,returnDetailedScanResult:true,calculateScanRegion:video=>({x:0,y:0,width:video.videoWidth||640,height:video.videoHeight||480,downScaledWidth:640,downScaledHeight:Math.round(640*(video.videoHeight||480)/(video.videoWidth||640))})});await scanner.start();void focusCamera();running=true;gate.code=null;resetFocus();$('placeholder').hidden=true;$('camera').textContent='Ⅱ  Dừng camera';$('state').textContent='● Đang quét';}catch{stop();toast('Không mở được camera. Hãy cho phép quyền camera hoặc dùng Quét từ ảnh.');}finally{busy=false;$('camera').disabled=false;}};
$('files').addEventListener('click',prepareAudio);
$('files').onchange=async e=>{const files=[...e.target.files];let ok=0;for(const file of files){try{const result=await QrScanner.scanImage(file,{returnDetailedScanResult:true});if(addCode(items,result.data)){ok++;beep();}}catch{}}render();toast(`Đã đọc ${ok}/${files.length} ảnh.${ok<files.length?' Ảnh còn lại không tìm thấy mã QR.':''}`);e.target.value='';};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(formatCodes(items));toast('Đã sao chép kết quả!');}catch{$('output').focus();$('output').select();if(document.execCommand('copy'))toast('Đã sao chép kết quả!');else toast('Hãy nhấn giữ kết quả hoặc Ctrl+C để sao chép.');}};
$('clear').onclick=()=>{if(confirm('Xóa toàn bộ danh sách sản phẩm?')){items.clear();gate.code=null;render();toast('Đã xóa danh sách');}};
// Preserve the user's camera intent when Safari suspends offscreen video.
let recovering=false,lastRecovery=0;
async function resumeCamera(){
  if(!running||busy||recovering||document.hidden)return;
  const video=$('video'),rect=video.getBoundingClientRect();
  if(rect.bottom<=0||rect.top>=window.innerHeight)return;
  const track=video.srcObject?.getVideoTracks()[0];
  if(!video.paused&&track?.readyState==='live'&&!track.muted)return;
  if(Date.now()-lastRecovery<1500)return;
  recovering=true;lastRecovery=Date.now();
  try{
    if(track?.readyState==='live'&&!track.muted){await video.play();await scanner.start();}
    else {await scanner.pause(true);await scanner.start();}
    if(!running||document.hidden){scanner.stop();return;}
    void focusCamera();$('state').textContent='● Đang quét';
  }catch{if(running)$('state').textContent='Chạm vùng camera để tiếp tục';}
  finally{recovering=false;}
}
const cameraObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void resumeCamera();});
cameraObserver.observe($('video'));
$('video').addEventListener('pause',()=>{setTimeout(resumeCamera,250);});
document.querySelector('.viewport').addEventListener('click',resumeCamera);
window.addEventListener('scroll',resumeCamera,{passive:true});
window.addEventListener('focus',resumeCamera);
window.addEventListener('pageshow',resumeCamera);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void resumeCamera();});
window.addEventListener('pagehide',()=>{scanner?.pause(true);});
setInterval(resumeCamera,2000);
render();
