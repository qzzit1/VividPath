import './style.css';

const $ = (s) => document.querySelector(s);
const state = {stream:null,mode:'door',busy:false,scan:false,interval:null,objects:null,clip:null,ocr:null,lastResult:'',lastAnnouncement:'',lastDirection:'',lastBeep:0,audio:null,recognition:null,speaking:false};
const SETTINGS_KEY='vividpath-settings-v1';
let settings={rate:1,frequency:6,beeps:true,autoSpeak:true};
try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{}
const icons={door:'▣',describe:'◫',objects:'◎',read:'≡',ask:'◉'};
const features=[['door','Find a door','Door direction · preview'],['describe','Describe scene','Recognize visible items'],['objects','Identify objects','On-device object detection'],['read','Read text','Printed text and speech'],['ask','Ask VividPath','Voice or typed commands']];
$('#app').innerHTML=`<main class="app"><header class="top"><div class="brand"><div class="logo" aria-hidden="true">V</div>VividPath</div><span class="chip">CAMERA ASSISTANT</span></header>
<section class="hero"><h1>Camera</h1><p>Point your camera at a doorway, object, or printed text.</p></section>
<section aria-label="Live camera"><div id="camera" class="camera"><video id="video" autoplay playsinline muted aria-label="Live rear camera view"></video><div class="placeholder"><div class="lens" aria-hidden="true">◎</div><strong>Your camera is ready</strong><p>Tap Start Camera to see your surroundings. Nothing is uploaded to our servers.</p></div><span id="camtag" class="camera-tag">● CAMERA OFF</span><div class="guide"><div class="crosshair"></div></div><div class="camera-bottom"><span class="hint" id="modeTag">DOOR FINDER</span><span class="hint" id="scanTag">NOT SCANNING</span></div></div>
<div class="control"><button id="toggleCamera" class="primary">Start camera</button><button id="scanButton" class="secondary" disabled>Analyze frame</button><button id="autoButton" class="secondary" disabled>Start continuous mode</button></div></section>
<div class="section-title">MODES</div><section class="features" id="features" aria-label="Assistance modes">${features.map(([id,name,desc])=>`<button class="feature ${id==='door'?'selected':''}" data-mode="${id}" aria-pressed="${id==='door'}"><span class="symbol" aria-hidden="true">${icons[id]}</span><strong>${name}</strong><small>${desc}</small></button>`).join('')}</section>
<section class="panel" aria-live="off"><h2 id="modeTitle">🚪 Find a door</h2><p id="modeInfo" class="muted">Looks for a door-like region in the live view and announces left, center, or right. This cannot confirm which door is nearest or whether walking toward it is safe.</p><div id="status" class="status" role="status" aria-live="polite">Start the camera to begin.</div><div id="result" class="result" aria-live="polite"></div><div class="row" style="margin-top:15px"><button id="repeat" class="secondary">Repeat audio</button><button id="stopSpeech" class="secondary">Stop audio</button></div><div id="askBox" style="display:none;margin-top:14px"><label for="question" class="note">Ask about the scene or choose a command</label><input class="field" id="question" placeholder="Where is the door?" autocomplete="off"/><div class="row" style="margin-top:10px"><button id="askSubmit" class="secondary">Ask question</button><button id="voiceButton" class="secondary">Voice input</button></div><p class="note">Try: “Where is the door?”, “What is in front of me?”, “Read this sign”. Speech recognition support varies by browser.</p></div><div id="readerBox" style="display:none;margin-top:14px"><div class="row"><button id="pauseSpeech" class="secondary">Pause voice</button><button id="resumeSpeech" class="secondary">Resume voice</button></div></div></section>
<section class="panel"><h2>Settings</h2><div class="setting"><label for="rate">Speech speed</label><select id="rate" class="field"><option value="0.8">Slower</option><option value="1">Normal</option><option value="1.2">Faster</option><option value="1.5">Fastest</option></select></div><div class="setting"><label for="frequency">Automatic scan interval</label><select id="frequency" class="field"><option value="3">3 seconds</option><option value="6">6 seconds</option><option value="10">10 seconds</option><option value="15">15 seconds</option></select></div><div class="setting"><label for="beeps">Directional audio cues</label><input type="checkbox" id="beeps"/></div><div class="setting"><label for="autoSpeak">Speak results outside continuous mode</label><input type="checkbox" id="autoSpeak"/></div><p class="note warning">Safety: VividPath is a demonstration assistant, not a navigation or mobility aid. It cannot judge safe routes, hazards, depth, or door distance. Use a cane, guide dog, or sighted assistance as appropriate. Do not walk based on these audio cues.</p><p class="note">Privacy: Camera frames are processed locally in your browser. AI models and OCR resources are downloaded from public third-party hosts. No image frames are sent to an inference service by this app. Do not point the camera at private information if you are uncomfortable with browser processing.</p></section><footer class="footer">VividPath · Camera tools · Internet required for first model download</footer>
</main>`;
$('#rate').value=String(settings.rate);$('#frequency').value=String(settings.frequency);$('#beeps').checked=settings.beeps;$('#autoSpeak').checked=settings.autoSpeak;
for(const id of ['rate','frequency','beeps','autoSpeak']){$('#'+id).addEventListener('change',()=>{settings.rate=Number($('#rate').value);settings.frequency=Number($('#frequency').value);settings.beeps=$('#beeps').checked;settings.autoSpeak=$('#autoSpeak').checked;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));if(state.scan){stopAuto();startAuto()}})}
const modeTexts={door:['Find a door','Analyzes the left, center and right camera regions for possible doors. Direction is approximate; distance and safety are unknown.'],describe:['Describe scene','Uses local object recognition to summarize objects visible in the frame; it cannot produce a detailed human-like scene description.'],objects:['Identify objects','Finds recognizable objects and reports approximate areas in the camera view.'],read:['Read text','Reads visible printed text with local optical character recognition.'],ask:['Ask VividPath','Ask preset types of questions about camera-recognized objects, text, or doors. This is not a general conversational AI.']};
function status(msg){$('#status').textContent=msg}
function result(msg,{speak=true}={}){state.lastResult=msg;$('#result').textContent=msg;const normalized=msg.replace(/\s+/g,' ').trim();if(speak&&(state.scan||settings.autoSpeak)&&normalized!==state.lastAnnouncement){say(msg);state.lastAnnouncement=normalized}}
function say(msg){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(msg);u.rate=settings.rate;u.lang='en-US';window.speechSynthesis.speak(u)}
function playBeep(direction){if(!settings.beeps)return;try{state.audio??=new (window.AudioContext||window.webkitAudioContext)();const ctx=state.audio;ctx.resume();const now=ctx.currentTime;const count=direction==='center'?3:direction==='left'?1:2;for(let i=0;i<count;i++){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=direction==='center'?820:direction==='left'?470:650;gain.gain.setValueAtTime(0,now+i*.17);gain.gain.linearRampToValueAtTime(.14,now+i*.17+.015);gain.gain.exponentialRampToValueAtTime(.001,now+i*.17+.12);osc.connect(gain);gain.connect(ctx.destination);osc.start(now+i*.17);osc.stop(now+i*.17+.13)}}catch(e){console.warn(e)}}
function setMode(mode){stopAuto();state.mode=mode;document.querySelectorAll('[data-mode]').forEach(x=>{let selected=x.dataset.mode===mode;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected))});$('#modeTitle').textContent=modeTexts[mode][0];$('#modeInfo').textContent=modeTexts[mode][1];$('#modeTag').textContent=mode.toUpperCase()+' MODE';$('#camera').classList.toggle('door',mode==='door');$('#askBox').style.display=mode==='ask'?'block':'none';$('#readerBox').style.display=mode==='read'?'block':'none';status('Mode selected. '+(state.stream?'Tap Analyze frame to start.':'Start the camera to begin.'));$('#result').textContent='';}
document.querySelectorAll('[data-mode]').forEach(x=>x.addEventListener('click',()=>setMode(x.dataset.mode)));
async function startCamera(){if(!window.isSecureContext){status('The camera requires a secure HTTPS address (or localhost). Deploy this site to HTTPS.');return}if(!navigator.mediaDevices?.getUserMedia){status('This browser does not support live camera access. Open in iPhone Safari.');return}try{status('Requesting rear camera permission…');const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});state.stream=stream;$('#video').srcObject=stream;await $('#video').play();$('#camera').classList.add('active');$('#camtag').classList.add('live');$('#camtag').textContent='LIVE CAMERA';$('#toggleCamera').textContent='Stop camera';$('#toggleCamera').classList.add('danger');$('#scanButton').disabled=false;$('#autoButton').disabled=false;status('Camera live. Select a mode, then tap Analyze frame.');}catch(e){status('Camera could not start: '+(e.name==='NotAllowedError'?'permission denied. Allow camera access in Safari settings.':e.message))}}
function stopCamera(){stopAuto();state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;$('#video').srcObject=null;$('#camera').classList.remove('active');$('#camtag').classList.remove('live');$('#camtag').textContent='● CAMERA OFF';$('#toggleCamera').textContent='Start camera';$('#toggleCamera').classList.remove('danger');$('#scanButton').disabled=true;$('#autoButton').disabled=true;window.speechSynthesis?.cancel();status('Camera stopped.')}
$('#toggleCamera').addEventListener('click',()=>state.stream?stopCamera():startCamera());
function capture(crop){const video=$('#video');if(!video.videoWidth)throw Error('Waiting for camera image.');const c=document.createElement('canvas');const w=video.videoWidth,h=video.videoHeight;const r=crop||[0,0,1,1];c.width=Math.max(1,Math.round(Math.min(640,w*r[2])));c.height=Math.max(1,Math.round(c.width*r[3]*h/(r[2]*w)));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,w*r[0],h*r[1],w*r[2],h*r[3],0,0,c.width,c.height);return c}
async function loadObjects(){if(!state.objects){status('Downloading the object recognition model (one-time, free)…');const [tf,coco]=await Promise.all([import('@tensorflow/tfjs'),import('@tensorflow-models/coco-ssd')]);await tf.ready();state.objects=await coco.load({base:'lite_mobilenet_v2'});}return state.objects}
async function recognizeObjects(){const model=await loadObjects();status('Recognizing objects in the live frame…');const detections=(await model.detect(capture())).filter(x=>x.score>=.45).slice(0,8);if(!detections.length)return 'No recognizable objects found in this frame. Try better lighting or a different angle.';return 'I may see '+detections.map(x=>x.class+' ('+Math.round(x.score*100)+'% confidence)').join(', ')+'.';}
async function loadClip(){if(!state.clip){status('Downloading the door recognition model. This large, free model may take several minutes and use significant memory on an iPhone…');const {pipeline,env}=await import('@huggingface/transformers');env.allowLocalModels=false;state.clip=await pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8',device:'wasm'});}return state.clip;}
async function findDoor(){const classifier=await loadClip();status('Checking three areas of the live frame for door-like features…');const regions=[['left',[0,0,.52,1]],['center',[.24,0,.52,1]],['right',[.48,0,.52,1]]];let scores=[];const labels=['a photo of a door or doorway','a photo of a wall without a door','a photo of a window','a photo of furniture'];for(const [direction,crop] of regions){const input=capture(crop).toDataURL('image/jpeg',.78);const predictions=await classifier(input,labels);const door=predictions.find(x=>x.label===labels[0]);scores.push({direction,score:door?.score||0});}scores.sort((a,b)=>b.score-a.score);const best=scores[0];if(best.score<.37 || best.score-scores[1].score<.065){state.lastDirection='';return 'I cannot confidently locate a door. Slowly rotate the camera or improve lighting. Do not navigate based on this result.';}state.lastDirection=best.direction;const directionText=best.direction==='center'?'possibly straight ahead':`possibly to your ${best.direction}`;playBeep(best.direction);return `Possible doorway ${directionText}. Experimental visual match ${Math.round(best.score*100)}%. ${best.direction==='left'?'One low tone.':best.direction==='right'?'Two medium tones.':'Three high tones.'} I cannot determine which door is nearest or whether there is a safe route.`}
function cleanOcr(data){
  // Rely on per-word confidence and line structure, not raw Tesseract text.
  const lines=(data.tsv||'').split(/\r?\n/).slice(1), kept=[];
  for(const row of lines){
    const f=row.split('\t'); if(f.length<12 || f[0]!=='5')continue;
    const confidence=Number(f[10]), word=f.slice(11).join('\t').trim();
    const chars=(word.match(/[A-Za-z0-9]/g)||[]).length;
    if(confidence<67 || chars<2 || chars/Math.max(1,word.length)<.75 || /^(.)\1{3,}$/.test(word))continue;
    kept.push({word,key:[f[2],f[3],f[4]].join(':'),confidence});
  }
  if(kept.length<2)return {text:'',score:0};
  const groups=[];
  for(const k of kept){if(groups.at(-1)?.key!==k.key)groups.push({key:k.key,words:[]});groups.at(-1).words.push(k.word)}
  const text=groups.map(g=>g.words.join(' ')).join('\n').trim();
  const alphabetic=(text.match(/[A-Za-z]/g)||[]).length;
  const symbols=(text.match(/[^A-Za-z0-9\s.,:;!?()'"$%&+\-/]/g)||[]).length;
  if(alphabetic<10 || symbols>alphabetic*.15)return {text:'',score:0};
  return {text:text.slice(0,2200),score:kept.reduce((n,k)=>n+k.confidence,0)/kept.length};
}
function prepOcrFrame(){
  const video=$('#video'), w=video.videoWidth,h=video.videoHeight;
  if(!w||!h)throw Error('Camera image is not ready.');
  const scale=Math.min(2.5, Math.max(1,1800/w)), out=document.createElement('canvas');
  out.width=Math.round(w*scale);out.height=Math.round(h*scale);
  const context=out.getContext('2d',{willReadFrequently:true});
  context.drawImage(video,0,0,out.width,out.height);
  return out;
}
function enhanceOcrFrame(source){
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data;
  for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];const c=Math.max(0,Math.min(255,(g-128)*1.55+128));d[i]=d[i+1]=d[i+2]=c}
  ctx.putImageData(img,0,0);return canvas;
}
async function readText(){
  status('Preparing text reader…');
  const Tesseract=await import('tesseract.js');
  if(!state.ocr){state.ocr=await Tesseract.createWorker('eng');await state.ocr.setParameters({preserve_interword_spaces:'1'})}
  status('Reading the camera frame. Hold the phone steady and fill the screen with text.');
  const frame=prepOcrFrame();
  let best=cleanOcr((await state.ocr.recognize(frame, {}, {tsv:true})).data);
  if(!best.text || best.score<78){
    status('Trying a higher-contrast scan…');
    const second=cleanOcr((await state.ocr.recognize(enhanceOcrFrame(frame), {}, {tsv:true})).data);
    if(second.score>best.score)best=second;
  }
  return best.text ? `Read text: ${best.text}` : 'I could not read the text clearly. Bring the camera closer, hold it still, and try stronger lighting.';
}
async function analyze(){if(!state.stream||state.busy)return;state.busy=true;$('#scanButton').disabled=true;try{let answer;if(state.mode==='door')answer=await findDoor();else if(state.mode==='read')answer=await readText();else answer=await recognizeObjects();result(answer);status('Analysis complete · '+new Date().toLocaleTimeString());}catch(e){console.error(e);status('Analysis unavailable: '+e.message+'. Check your connection and available device memory.');}finally{state.busy=false;$('#scanButton').disabled=!state.stream;}}
$('#scanButton').addEventListener('click',analyze);
function stopAuto(){state.scan=false;clearInterval(state.interval);state.interval=null;$('#autoButton').textContent='Start continuous mode';$('#autoButton').classList.remove('danger');$('#scanTag').textContent='NOT SCANNING'}
function startAuto(){if(!state.stream)return;state.scan=true;state.lastAnnouncement='';say('Continuous mode started. I will speak when I find something new.');$('#autoButton').textContent='Stop continuous mode';$('#autoButton').classList.add('danger');$('#scanTag').textContent='AUTO SCAN '+settings.frequency+'S';analyze();state.interval=setInterval(()=>{if(!state.busy)analyze()},settings.frequency*1000)}
$('#autoButton').addEventListener('click',()=>state.scan?stopAuto():startAuto());
$('#repeat').addEventListener('click',()=>state.lastResult?say(state.lastResult):status('No result to repeat yet.'));
$('#stopSpeech').addEventListener('click',()=>window.speechSynthesis?.cancel());
$('#pauseSpeech').addEventListener('click',()=>window.speechSynthesis?.pause());
$('#resumeSpeech').addEventListener('click',()=>window.speechSynthesis?.resume());
async function ask(){const q=$('#question').value.trim().toLowerCase();if(!q){status('Type a question first.');return}if(!state.stream){status('Start the camera to ask about what is visible.');return}if(/door|exit|entrance|way out|navigate/.test(q))setMode('door');else if(/read|text|sign|menu|label|written/.test(q))setMode('read');else setMode('objects');await analyze();}
$('#askSubmit').addEventListener('click',ask);$('#question').addEventListener('keydown',e=>{if(e.key==='Enter')ask()});
$('#voiceButton').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Voice transcription is not supported by this browser. Use the question box or iPhone keyboard dictation.');return}try{state.recognition?.abort();const recognition=new SR();state.recognition=recognition;recognition.lang='en-US';recognition.interimResults=false;recognition.onresult=e=>{$('#question').value=e.results[0][0].transcript;ask()};recognition.onerror=e=>status('Speech recognition error: '+e.error);recognition.onend=()=>{$('#voiceButton').textContent='Voice input'};$('#voiceButton').textContent='Listening…';recognition.start()}catch(e){status('Microphone could not start: '+e.message)}});
window.addEventListener('pagehide',()=>{stopCamera();state.ocr?.terminate?.()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAuto();window.speechSynthesis?.cancel()}});
setMode('door');
