import QrScanner from './qr-scanner.min.js';
import {addCode,formatCodes,canAccept} from './model.mjs';
const $=id=>document.getElementById(id),items=new Map();let scanner,running=false,busy=false,timer;const gate={code:null,seen:0};
let audioContext, nextBeepAt=0;
function prepareAudio(){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return;
    audioContext??=new AudioContext();
    if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{});
  }catch{}
}
function beep(){
  try{
    if(audioContext?.state!=='running')return;
    const start=Math.max(audioContext.currentTime,nextBeepAt);
    const tone=audioContext.createOscillator(),volume=audioContext.createGain();
    tone.type='sine';tone.frequency.value=1200;
    volume.gain.setValueAtTime(0,start);
    volume.gain.linearRampToValueAtTime(0.18,start+0.01);
    volume.gain.setValueAtTime(0.18,start+0.09);
    volume.gain.linearRampToValueAtTime(0,start+0.14);
    tone.connect(volume);volume.connect(audioContext.destination);
    tone.onended=()=>{tone.disconnect();volume.disconnect();};
    tone.start(start);tone.stop(start+0.15);nextBeepAt=start+0.22;
  }catch{}
}
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
function stop(){scanner?.stop();running=false;document.querySelector('.guide').hidden=false;$('placeholder').hidden=false;$('camera').textContent='◎  Bật camera';$('state').textContent='Camera đang tắt';}
$('camera').onclick=async()=>{if(busy)return;if(running){stop();return;}prepareAudio();busy=true;$('camera').disabled=true;try{scanner??=new QrScanner($('video'),result=>{if(canAccept(gate,result.data,Date.now())){add(result.data);navigator.vibrate?.(60);}},{preferredCamera:'environment',maxScansPerSecond:8,returnDetailedScanResult:true,highlightCodeOutline:true,calculateScanRegion:video=>({x:0,y:0,width:video.videoWidth||640,height:video.videoHeight||480,downScaledWidth:640,downScaledHeight:Math.round(640*(video.videoHeight||480)/(video.videoWidth||640))})});await scanner.start();void focusCamera();running=true;gate.code=null;document.querySelector('.guide').hidden=true;$('placeholder').hidden=true;$('camera').textContent='Ⅱ  Dừng camera';$('state').textContent='● Đang quét';}catch{stop();toast('Không mở được camera. Hãy cho phép quyền camera hoặc dùng Quét từ ảnh.');}finally{busy=false;$('camera').disabled=false;}};
$('files').addEventListener('click',prepareAudio);
$('files').onchange=async e=>{prepareAudio();const files=[...e.target.files];let ok=0;for(const file of files){try{const result=await QrScanner.scanImage(file,{returnDetailedScanResult:true});if(addCode(items,result.data)){ok++;beep();}}catch{}}render();toast(`Đã đọc ${ok}/${files.length} ảnh.${ok<files.length?' Ảnh còn lại không tìm thấy mã QR.':''}`);e.target.value='';};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(formatCodes(items));toast('Đã sao chép kết quả!');}catch{$('output').focus();$('output').select();if(document.execCommand('copy'))toast('Đã sao chép kết quả!');else toast('Hãy nhấn giữ kết quả hoặc Ctrl+C để sao chép.');}};
$('clear').onclick=()=>{if(confirm('Xóa toàn bộ danh sách sản phẩm?')){items.clear();gate.code=null;render();toast('Đã xóa danh sách');}};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop();});window.addEventListener('pagehide',()=>scanner?.destroy());render();
