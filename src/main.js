import './style.css';

const $ = (s) => document.querySelector(s);
const state = {stream:null,mode:'door',busy:false,scan:false,interval:null,objects:null,clip:null,ocr:null,lastResult:'',lastAnnouncement:'',lastDirection:'',doorCandidate:'',doorStreak:0,lastDoorSpoken:'',lastBeep:0,lastSpokenAt:0,tickTimer:null,tickLevel:0,tickExpires:0,audio:null,recognition:null,speaking:false};
const SETTINGS_KEY='vividpath-settings-v1';
let settings={rate:1,frequency:6,beeps:true,autoSpeak:true};
try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{}
const icons={door:'▣',describe:'◫',objects:'◎',read:'≡',ask:'◉'};
const features=[['door','Find a door',''],['describe','Describe scene',''],['objects','Identify objects',''],['read','Read text',''],['ask','Ask VividPath','']];
$('#app').innerHTML=`<main class="app"><header class="top"><div class="brand"><div class="logo" aria-hidden="true">V</div>VividPath</div></header>
<div id="cameraPage"><section class="hero"><h1>Camera</h1></section>
<section aria-label="Live camera"><div id="camera" class="camera"><video id="video" autoplay playsinline muted aria-label="Live rear camera view"></video><div class="placeholder" aria-hidden="true"><div class="lens">◎</div></div><span id="camtag" class="camera-tag">● CAMERA OFF</span><div class="guide"><div class="crosshair"></div></div><div class="camera-bottom"><span class="hint" id="modeTag">DOOR FINDER</span><span class="hint" id="scanTag">NOT SCANNING</span></div></div>
<div class="control"><button id="toggleCamera" class="primary">Start camera</button><button id="scanButton" class="secondary" disabled>Analyze frame</button><button id="autoButton" class="secondary" disabled>Start continuous mode</button></div></section>
<div class="section-title">MODES</div><section class="features" id="features" aria-label="Assistance modes">${features.map(([id,name,desc])=>`<button class="feature ${id==='door'?'selected':''}" data-mode="${id}" aria-pressed="${id==='door'}"><span class="symbol" aria-hidden="true">${icons[id]}</span><strong>${name}</strong></button>`).join('')}</section>
<section class="panel" aria-live="off"><h2 id="modeTitle">🚪 Find a door</h2><p id="modeInfo" class="muted" hidden></p><div id="status" class="status" role="status" aria-live="polite">Start the camera to begin.</div><div id="result" class="result" aria-live="polite"></div><div class="row" style="margin-top:15px"><button id="repeat" class="secondary">Repeat audio</button><button id="stopSpeech" class="secondary">Stop audio</button></div><div id="askBox" style="display:none;margin-top:14px"><label for="question" class="sr-only">Question</label><input class="field" id="question" placeholder="Where is the door?" autocomplete="off"/><div class="row" style="margin-top:10px"><button id="askSubmit" class="secondary">Ask question</button><button id="voiceButton" class="secondary">Voice input</button></div><p class="note"></p></div><div id="readerBox" style="display:none;margin-top:14px"><div class="row"><button id="pauseSpeech" class="secondary">Pause voice</button><button id="resumeSpeech" class="secondary">Resume voice</button></div></div></section>
<section class="panel"><h2>Settings</h2><div class="setting"><label for="rate">Speech speed</label><select id="rate" class="field"><option value="0.8">Slower</option><option value="1">Normal</option><option value="1.2">Faster</option><option value="1.5">Fastest</option></select></div><div class="setting"><label for="frequency">Automatic scan interval</label><select id="frequency" class="field"><option value="3">3 seconds</option><option value="6">6 seconds</option><option value="10">10 seconds</option><option value="15">15 seconds</option></select></div><div class="setting"><label for="beeps">Door proximity-style ticking</label><input type="checkbox" id="beeps"/></div><div class="setting"><label for="autoSpeak">Speak results outside continuous mode</label><input type="checkbox" id="autoSpeak"/></div></section></div>
<section id="nearbyPage" class="nearby-page" hidden aria-label="Accessibility Map"><div class="nearby-heading"><h1>Accessibility Map</h1><button id="locateButton" class="primary">Use my location</button></div><div id="locationStatus" role="status" aria-live="polite"></div><div id="nearbyMap" aria-label="Map of nearby public places"></div><div id="placeList" aria-live="polite"></div></section>
<section id="reviewsPage" class="reviews-page" hidden aria-label="Reviews"><div class="nearby-heading"><h1>Reviews</h1><button id="reviewsLocate" class="primary" type="button">Find places</button></div><div id="reviewsStatus" role="status" aria-live="polite"></div><label class="review-label" for="reviewsSearch">Search public places</label><input class="field" id="reviewsSearch" type="search" placeholder="Search by name" autocomplete="off"/><div class="review-heading"><h2>Places near you</h2><span id="reviewSlideCount"></span></div><div id="reviewSlides" class="review-slides" aria-label="Five nearby places, scroll horizontally"></div><div id="reviewSearchResults" class="review-results"></div><section id="reviewFormArea" class="review-form" hidden><h2 id="reviewPlaceName"></h2><p id="reviewPlaceDetails"></p><fieldset><legend>Accessibility rating</legend><div class="rating-options"><label><input type="radio" name="reviewRating" value="No accessibility"/> No accessibility</label><label><input type="radio" name="reviewRating" value="Low accessibility"/> Low accessibility</label><label><input type="radio" name="reviewRating" value="Moderate accessibility"/> Moderate accessibility</label><label><input type="radio" name="reviewRating" value="High accessibility"/> High accessibility</label></div></fieldset><button id="saveReview" type="button" class="primary">Save rating</button><div id="reviewSaved" role="status" aria-live="polite"></div></section></section>
<nav class="bottom-nav" aria-label="Main navigation"><button id="tabCamera" class="tab active" aria-current="page"><span aria-hidden="true">◎</span> Camera</button><button id="tabNearby" class="tab"><span aria-hidden="true">⌖</span> Accessibility Map</button><button id="tabReviews" class="tab"><span aria-hidden="true">★</span> Reviews</button></nav>
</main>`;
$('#rate').value=String(settings.rate);$('#frequency').value=String(settings.frequency);$('#beeps').checked=settings.beeps;$('#autoSpeak').checked=settings.autoSpeak;
for(const id of ['rate','frequency','beeps','autoSpeak']){$('#'+id).addEventListener('change',()=>{settings.rate=Number($('#rate').value);settings.frequency=Number($('#frequency').value);settings.beeps=$('#beeps').checked;if(!settings.beeps)stopTicks();settings.autoSpeak=$('#autoSpeak').checked;localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));if(state.scan){stopAuto();startAuto()}})}
const modeTexts={door:['Find a door',''],describe:['Describe scene',''],objects:['Identify objects',''],read:['Read text',''],ask:['Ask VividPath','']};
function status(msg){const el=$('#status');const important=/error|unavailable|could not|denied|requires|does not support|not supported|failed|permission|no result|type a question|start the camera to ask/i.test(msg);el.textContent=important?msg:'';el.hidden=!important}
function result(msg,{speak=true}={}){
  state.lastResult=msg;$('#result').textContent=msg;
  const normalized=msg.replace(/\s+/g,' ').trim();
  // Manual scans always speak. Continuous scans can repeat an unchanged result after 10s.
  const due=Date.now()-state.lastSpokenAt>10000;
  if(speak&&normalized&&(state.scan||settings.autoSpeak)&&(!state.scan||normalized!==state.lastAnnouncement||due)){
    say(msg);state.lastAnnouncement=normalized;state.lastSpokenAt=Date.now();
  }
}
function unlockSpeech(){
  // Must run directly inside an iPhone tap/click event, before any awaited model work.
  if(!('speechSynthesis' in window))return;
  try{
    window.speechSynthesis.resume();
    if(!state.voiceUnlocked){const u=new SpeechSynthesisUtterance(' ');u.volume=0;window.speechSynthesis.speak(u);state.voiceUnlocked=true;}
    state.audio??=new (window.AudioContext||window.webkitAudioContext)();state.audio.resume();
  }catch(e){console.warn('Audio unlock:',e)}
}
function say(msg){
  if(!('speechSynthesis' in window)||!msg)return;
  const synth=window.speechSynthesis;
  try{
    synth.cancel();synth.resume();
    const u=new SpeechSynthesisUtterance(msg);u.rate=settings.rate;u.lang='en-US';u.volume=1;
    u.onerror=e=>console.warn('Speech error:',e.error);
    synth.speak(u);
  }catch(e){console.warn('Speech unavailable',e)}
}
// Lightweight synthesized ticks. Tick tempo responds to a VISUAL prominence
// score, not measured depth. This is a stationary demonstration cue only.
function stopTicks(){
  if(state.tickTimer!==null){clearInterval(state.tickTimer);state.tickTimer=null;}
  state.tickLevel=0;state.tickExpires=0;
  try{navigator.vibrate?.(0)}catch{}
}
function makeTick(){
  if(!settings.beeps||!state.stream||state.mode!=='door'||document.hidden||Date.now()>state.tickExpires){stopTicks();return}
  try{
    const ctx=state.audio;if(!ctx||ctx.state!=='running')return;
    const at=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='square';osc.frequency.setValueAtTime(900,at);
    gain.gain.setValueAtTime(0.0001,at);
    gain.gain.exponentialRampToValueAtTime(0.085,at+0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001,at+0.045);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(at);osc.stop(at+0.06);
    if(typeof navigator.vibrate==='function')navigator.vibrate(28);
  }catch(e){console.warn('Tick audio:',e)}
}
function updateTicks(prominence){
  if(!settings.beeps)return stopTicks();
  // 500–1100ms between ticks. High similarity isn't proof of closeness.
  const level=Math.max(0,Math.min(1,(prominence-0.54)/0.34));
  const interval=Math.round(1100-600*level);
  state.tickExpires=Date.now()+Math.max(4500,settings.frequency*1000+2000);
  if(state.tickTimer!==null&&Math.abs(state.tickLevel-interval)<90)return;
  if(state.tickTimer!==null)clearInterval(state.tickTimer);
  state.tickLevel=interval;
  makeTick();state.tickTimer=setInterval(makeTick,interval);
}
function setMode(mode){stopTicks();stopAuto();state.mode=mode;state.doorCandidate='';state.doorStreak=0;state.lastDoorSpoken='';document.querySelectorAll('[data-mode]').forEach(x=>{let selected=x.dataset.mode===mode;x.classList.toggle('selected',selected);x.setAttribute('aria-pressed',String(selected))});$('#modeTitle').textContent=modeTexts[mode][0];$('#modeInfo').textContent=modeTexts[mode][1];$('#modeInfo').hidden=!modeTexts[mode][1];$('#modeTag').textContent=mode.toUpperCase()+' MODE';$('#camera').classList.toggle('door',mode==='door');$('#askBox').style.display=mode==='ask'?'block':'none';$('#readerBox').style.display=mode==='read'?'block':'none';status('Mode selected. '+(state.stream?'Tap Analyze frame to start.':'Start the camera to begin.'));$('#result').textContent='';}
document.querySelectorAll('[data-mode]').forEach(x=>x.addEventListener('click',()=>setMode(x.dataset.mode)));
async function startCamera(){if(!window.isSecureContext){status('The camera requires a secure HTTPS address (or localhost). Deploy this site to HTTPS.');return}if(!navigator.mediaDevices?.getUserMedia){status('This browser does not support live camera access. Open in iPhone Safari.');return}try{status('Requesting rear camera permission…');const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});state.stream=stream;$('#video').srcObject=stream;await $('#video').play();$('#camera').classList.add('active');$('#camtag').classList.add('live');$('#camtag').textContent='LIVE CAMERA';$('#toggleCamera').textContent='Stop camera';$('#toggleCamera').classList.add('danger');$('#scanButton').disabled=false;$('#autoButton').disabled=false;status('Camera live. Select a mode, then tap Analyze frame.');}catch(e){status('Camera could not start: '+(e.name==='NotAllowedError'?'permission denied. Allow camera access in Safari settings.':e.message))}}
function stopCamera(){stopTicks();stopAuto();state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;$('#video').srcObject=null;$('#camera').classList.remove('active');$('#camtag').classList.remove('live');$('#camtag').textContent='● CAMERA OFF';$('#toggleCamera').textContent='Start camera';$('#toggleCamera').classList.remove('danger');$('#scanButton').disabled=true;$('#autoButton').disabled=true;window.speechSynthesis?.cancel();status('Camera stopped.')}
$('#toggleCamera').addEventListener('click',()=>state.stream?stopCamera():startCamera());
function capture(crop){const video=$('#video');if(!video.videoWidth)throw Error('Waiting for camera image.');const c=document.createElement('canvas');const w=video.videoWidth,h=video.videoHeight;const r=crop||[0,0,1,1];c.width=Math.max(1,Math.round(Math.min(640,w*r[2])));c.height=Math.max(1,Math.round(c.width*r[3]*h/(r[2]*w)));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,w*r[0],h*r[1],w*r[2],h*r[3],0,0,c.width,c.height);return c}
async function loadObjects(){if(!state.objects){status('Downloading the object recognition model (one-time, free)…');const [tf,coco]=await Promise.all([import('@tensorflow/tfjs'),import('@tensorflow-models/coco-ssd')]);await tf.ready();state.objects=await coco.load({base:'lite_mobilenet_v2'});}return state.objects}
async function recognizeObjects(){const model=await loadObjects();status('Recognizing objects in the live frame…');const detections=(await model.detect(capture())).filter(x=>x.score>=.45).slice(0,8);if(!detections.length)return 'No recognizable objects found in this frame. Try better lighting or a different angle.';return 'I may see '+detections.map(x=>x.class+' ('+Math.round(x.score*100)+'% confidence)').join(', ')+'.';}
// Scene mode produces a spatial, concise summary, rather than repeating the object list.
// This is grounded in the on-device detector's results, not a generative scene model.
async function describeScene(){
  const model=await loadObjects();status('Summarizing the camera view…');
  const frame=capture();
  const items=(await model.detect(frame)).filter(d=>d.score>=.50).slice(0,12);
  if(!items.length)return 'I cannot make out enough detail to describe this view.';
  const center=d=>d.bbox[0]+d.bbox[2]/2;
  const side=d=>center(d)<frame.width*.34?'on the left':center(d)>frame.width*.66?'on the right':'near the center';
  const unique=[];const seen=new Set();
  for(const d of [...items].sort((a,b)=>b.score-a.score)){
    const key=d.class+':'+side(d);
    if(!seen.has(key)){seen.add(key);unique.push(d)}
  }
  const people=items.filter(d=>d.class==='person').length;
  const others=unique.filter(d=>d.class!=='person').slice(0,3);
  const clauses=[];
  if(people)clauses.push(people===1?`A person is ${side(items.find(d=>d.class==='person'))}`:`There are ${people} people in view`);
  for(const d of others)clauses.push(`a ${d.class} is ${side(d)}`);
  if(!clauses.length)return 'I can see objects, but cannot describe their arrangement reliably.';
  let sentence=clauses[0][0].toUpperCase()+clauses[0].slice(1);
  if(clauses.length>1)sentence+=', and '+clauses.slice(1).join(', ');
  return sentence+'. This is a partial view.';
}
async function loadClip(){if(!state.clip){status('Downloading the door recognition model. This large, free model may take several minutes and use significant memory on an iPhone…');const {pipeline,env}=await import('@huggingface/transformers');env.allowLocalModels=false;state.clip=await pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8',device:'wasm'});}return state.clip;}
// Directional *camera-view* detection, not distance estimation or a walking route.
// Compare door prompts against non-door prompts within each crop rather than
// comparing raw door softmax values from unrelated crops.
async function findDoor(){
  const classifier=await loadClip();status('Checking for doors…');
  // Two overlapping crops instead of four model passes to reduce scan latency.
  // A full door can still fit in each crop even when close to the camera.
  const labels=[
    'a photo of a door or open doorway',
    'a photo of a close up door frame',
    'a photo of a wall without any door',
    'a photo of a window or furniture'
  ];
  const regions=[
    {direction:'left',rect:[0,0,.68,1]},
    {direction:'right',rect:[.32,0,.68,1]}
  ];
  const results=[];
  for(const r of regions){
    const image=capture(r.rect).toDataURL('image/jpeg',.78);
    const predictions=await classifier(image,labels);
    const scores=new Map(predictions.map(p=>[p.label,p.score]));
    const positive=(scores.get(labels[0])||0)+(scores.get(labels[1])||0);
    results.push({direction:r.direction,positive});
  }
  const left=results[0].positive,right=results[1].positive;
  // This classifier measures visual similarity, not calibrated detection confidence.
  if(Math.max(left,right)<.54){state.doorCandidate='';state.doorStreak=0;state.lastDirection='';stopTicks();return '';}
  const direction=Math.abs(left-right)<.10?'center':left>right?'left':'right';
  state.doorStreak=state.doorCandidate===direction?state.doorStreak+1:1;
  state.doorCandidate=direction;
  // Do not require two scans: that had delayed the first spoken response.
  state.lastDirection=direction;
  const phrase=direction==='center'?'Door ahead':`Door ${direction}`;
  updateTicks(Math.max(left,right));
  state.lastDoorSpoken=phrase;
  return phrase;
}

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
async function analyze(){if(!state.stream||state.busy)return;state.busy=true;$('#scanButton').disabled=true;try{let answer;if(state.mode==='door')answer=await findDoor();else if(state.mode==='read')answer=await readText();else if(state.mode==='describe')answer=await describeScene();else answer=await recognizeObjects();if(state.mode==='door'&&!answer){result('',{speak:false});status('Scanning…');}else{result(answer);status('Analysis complete · '+new Date().toLocaleTimeString());}}catch(e){console.error(e);status('Analysis unavailable: '+e.message+'. Check your connection and available device memory.');}finally{state.busy=false;$('#scanButton').disabled=!state.stream;}}
$('#scanButton').addEventListener('click',()=>{unlockSpeech();analyze();});
function stopAuto(){stopTicks();state.scan=false;clearInterval(state.interval);state.interval=null;$('#autoButton').textContent='Start continuous mode';$('#autoButton').classList.remove('danger');$('#scanTag').textContent='NOT SCANNING'}
function startAuto(){if(!state.stream)return;state.scan=true;state.lastAnnouncement='';state.lastSpokenAt=0;if(state.mode!=='door')say('Continuous mode started.');$('#autoButton').textContent='Stop continuous mode';$('#autoButton').classList.add('danger');$('#scanTag').textContent='AUTO SCAN '+settings.frequency+'S';analyze();state.interval=setInterval(()=>{if(!state.busy)analyze()},settings.frequency*1000)}
$('#autoButton').addEventListener('click',()=>{unlockSpeech();state.scan?stopAuto():startAuto();});
$('#repeat').addEventListener('click',()=>{unlockSpeech();state.lastResult?say(state.lastResult):status('No result to repeat yet.');});
$('#stopSpeech').addEventListener('click',()=>{window.speechSynthesis?.cancel();stopTicks();});
$('#pauseSpeech').addEventListener('click',()=>window.speechSynthesis?.pause());
$('#resumeSpeech').addEventListener('click',()=>window.speechSynthesis?.resume());
async function ask(){const q=$('#question').value.trim().toLowerCase();if(!q){status('Type a question first.');return}if(!state.stream){status('Start the camera to ask about what is visible.');return}if(/door|exit|entrance|way out|navigate/.test(q))setMode('door');else if(/read|text|sign|menu|label|written/.test(q))setMode('read');else if(/describe|surround|scene|room|around me|front of me/.test(q))setMode('describe');else setMode('objects');await analyze();}
$('#askSubmit').addEventListener('click',ask);$('#question').addEventListener('keydown',e=>{if(e.key==='Enter')ask()});
$('#voiceButton').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status('Voice transcription is not supported by this browser. Use the question box or iPhone keyboard dictation.');return}try{state.recognition?.abort();const recognition=new SR();state.recognition=recognition;recognition.lang='en-US';recognition.interimResults=false;recognition.onresult=e=>{$('#question').value=e.results[0][0].transcript;ask()};recognition.onerror=e=>status('Speech recognition error: '+e.error);recognition.onend=()=>{$('#voiceButton').textContent='Voice input'};$('#voiceButton').textContent='Listening…';recognition.start()}catch(e){status('Microphone could not start: '+e.message)}});
window.addEventListener('pagehide',()=>{stopCamera();state.ocr?.terminate?.()});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopTicks();stopAuto();window.speechSynthesis?.cancel()}});
setMode('door');

// Nearby places: public OpenStreetMap data, not a validated accessibility certification.
const nearbyState={map:null,markers:[],position:null,loaded:false,loading:false,places:[]};
const publicTypes={library:'Library',community_centre:'Community center',townhall:'Town hall',museum:'Museum',arts_centre:'Arts center',theatre:'Theater',cinema:'Cinema',public_building:'Public building',social_facility:'Social facility',hospital:'Hospital',clinic:'Clinic',post_office:'Post office',police:'Police station',university:'University',college:'College',school:'School'};
function selectTab(name){
  const onMap=name==='nearby',onReviews=name==='reviews',onCamera=name==='camera';
  $('#cameraPage').hidden=!onCamera;$('#nearbyPage').hidden=!onMap;$('#reviewsPage').hidden=!onReviews;
  for(const [id,active] of [['tabCamera',onCamera],['tabNearby',onMap],['tabReviews',onReviews]]){
    const button=$('#'+id);button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');
  }
  if(!onCamera){stopTicks();stopAuto();window.speechSynthesis?.cancel();}
  if(onMap&&nearbyState.map)setTimeout(()=>nearbyState.map.invalidateSize(),30);
  if(onReviews){renderReviewPlaces(); if(!nearbyState.position&&!nearbyState.loading) loadReviewLocation();}
}
$('#tabCamera').addEventListener('click',()=>selectTab('camera'));
$('#tabNearby').addEventListener('click',()=>selectTab('nearby'));
$('#tabReviews').addEventListener('click',()=>selectTab('reviews'));
function nearbyStatus(message){$('#locationStatus').textContent=message}
function escapeText(s){return String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function getEvidence(tags){const e=[];for(const [key,desc] of [['tactile_paving','Tactile paving'],['tactile_map','Tactile map'],['braille','Braille information'],['audio_guidance','Audio guidance'],['audio_description','Audio description'],['guide_dogs','Guide dogs']]){const value=(tags[key]||'').toLowerCase();if(['yes','designated','available'].includes(value))e.push(desc)}if(tags['blind:description'])e.push('Accessibility description');if(tags['information']==='tactile_map')e.push('Tactile map');if(tags['information']==='audio')e.push('Audio information');return [...new Set(e)]}
// Category-level heuristic: never assert a specific venue has an unverified amenity.
const categoryProfiles={
  Library:{rating:'Good accessibility',features:['Staff assistance','Audio resources'],rank:4},
  Museum:{rating:'Moderate accessibility',features:['Audio tours','Accessible exhibitions'],rank:3},
  Theater:{rating:'Moderate accessibility',features:['Audio-described performances'],rank:3},
  'Community center':{rating:'Moderate accessibility',features:['Front-desk help'],rank:3},
  Hospital:{rating:'Moderate accessibility',features:['Reception assistance'],rank:3},
  School:{rating:'Limited accessibility',features:['Staff assistance'],rank:2},
  University:{rating:'Limited accessibility',features:['Orientation support'],rank:2},
  College:{rating:'Limited accessibility',features:['Orientation support'],rank:2},
};
function categoryProfile(kind){return categoryProfiles[kind]||{rating:'Limited accessibility',features:['Staff assistance'],rank:2}}
function distanceMeters(a,b){const r=Math.PI/180,phi1=a.lat*r,phi2=b.lat*r,dphi=(b.lat-a.lat)*r,dl=(b.lon-a.lon)*r;const h=Math.sin(dphi/2)**2+Math.cos(phi1)*Math.cos(phi2)*Math.sin(dl/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(h)))}
function formatDistance(m){return m<1000?`${Math.round(m/25)*25} m`:`${(m/1000).toFixed(1)} km`}
function fetchLocation(){if(!navigator.geolocation){nearbyStatus('Location is unavailable in this browser.');return}if(nearbyState.loading)return;nearbyState.loading=true;$('#locateButton').disabled=true;nearbyStatus('Getting your location…');navigator.geolocation.getCurrentPosition(async pos=>{const position={lat:pos.coords.latitude,lon:pos.coords.longitude};nearbyState.position=position;nearbyStatus('Finding nearby public places…');try{await loadNearby(position)}catch(err){console.error(err);nearbyStatus('Could not load nearby places. Check your connection and try again.')}finally{nearbyState.loading=false;$('#locateButton').disabled=false} },err=>{nearbyStatus(err.code===1?'Location permission was denied. Enable Location in iPhone Settings for this website.':'Could not determine your location. Try again outdoors or near a window.');nearbyState.loading=false;$('#locateButton').disabled=false},{enableHighAccuracy:true,timeout:15000,maximumAge:60000})}
$('#locateButton').addEventListener('click',fetchLocation);
async function setupLeaflet(){if(window.L)return window.L;const cssId='leaflet-vividpath';if(!document.getElementById(cssId)){const css=document.createElement('link');css.id=cssId;css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.append(css)}if(!window.__vividLeafletPromise){window.__vividLeafletPromise=new Promise((resolve,reject)=>{const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.onload=()=>resolve(window.L);js.onerror=()=>reject(Error('Map library is unavailable'));document.head.append(js)})}return window.__vividLeafletPromise}
async function queryNearby(position){const lat=position.lat.toFixed(5),lon=position.lon.toFixed(5);const query=`[out:json][timeout:20];(nwr["amenity"~"^(library|community_centre|townhall|arts_centre|theatre|cinema|social_facility|hospital|clinic|post_office|police|university|college|school)$"](around:1800,${lat},${lon});nwr["tourism"="museum"](around:1800,${lat},${lon}););out center 140;`;const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query})});if(!response.ok)throw Error('Places request failed: '+response.status);const json=await response.json();const seen=new Set();return(json.elements||[]).map(el=>{const lat=el.lat??el.center?.lat,lon=el.lon??el.center?.lon,t=el.tags||{};if(!Number.isFinite(lat)||!Number.isFinite(lon)||!t.name)return null;const key=t.name.toLowerCase()+':'+lat.toFixed(3)+':'+lon.toFixed(3);if(seen.has(key))return null;seen.add(key);const evidence=getEvidence(t);const kind=publicTypes[t.amenity]||(t.tourism==='museum'?'Museum':'Public place');const categoryEstimate=categoryProfile(kind);return {name:t.name,kind,lat,lon,evidence,categoryEstimate,dist:distanceMeters(position,{lat,lon}),id:el.type+'/'+el.id}}).filter(Boolean).sort((a,b)=>b.evidence.length-a.evidence.length||b.categoryEstimate.rank-a.categoryEstimate.rank||a.dist-b.dist).slice(0,35)}
async function loadNearby(position){const places=await queryNearby(position); nearbyState.places=places;const L=await setupLeaflet();if(!nearbyState.map){nearbyState.map=L.map('nearbyMap',{scrollWheelZoom:false}).setView([position.lat,position.lon],14);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(nearbyState.map)}const map=nearbyState.map;nearbyState.markers.forEach(m=>map.removeLayer(m));nearbyState.markers=[];map.setView([position.lat,position.lon],14);nearbyState.markers.push(L.circleMarker([position.lat,position.lon],{radius:8,color:'#155fbd',fillColor:'#155fbd',fillOpacity:1,weight:2}).addTo(map).bindPopup('Your location (approximate)'));const list=$('#placeList');list.replaceChildren();if(!places.length){nearbyStatus('No mapped public places found nearby. Try again in another area.');return}let identified=places.filter(p=>p.evidence.length).length;nearbyState.places=places; nearbyStatus(`${places.length} places nearby`); if(!$('#reviewsPage').hidden)renderReviewPlaces();
for(const [index,p] of places.entries()){const marker=L.circleMarker([p.lat,p.lon],{radius:p.evidence.length?7:5,color:p.evidence.length?'#157453':'#68778c',fillColor:p.evidence.length?'#157453':'#68778c',fillOpacity:.85,weight:1}).addTo(map);nearbyState.markers.push(marker);marker.bindPopup(escapeText(p.name));const article=document.createElement('article');article.className='place-item';const evidence=p.evidence.length?`<span class="evidence">Recorded: ${escapeText(p.evidence.join(' · '))}</span>`:`<span class="demo-rating">Estimated · ${escapeText(p.categoryEstimate.rating)}</span><span class="demo-features">Check for: ${escapeText(p.categoryEstimate.features.join(' · '))}</span>`;article.innerHTML=`<div class="place-title"><strong>${escapeText(p.name)}</strong><span>${formatDistance(p.dist)}</span></div><div class="place-kind">${escapeText(p.kind)}</div>${evidence}<div class="place-actions"><button class="secondary place-show" type="button">Show on map</button><a class="place-link" target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/${encodeURIComponent(p.id.split('/')[0])}/${encodeURIComponent(p.id.split('/')[1])}">Place details ↗</a></div>`;article.querySelector('button').addEventListener('click',()=>{map.setView([p.lat,p.lon],16);marker.openPopup();document.getElementById('nearbyMap').scrollIntoView({behavior:'smooth',block:'center'})});list.append(article)}setTimeout(()=>map.invalidateSize(),50)}


// Reviews are stored privately in this browser. They do not modify map rankings.
const REVIEW_KEY='vividpath-place-reviews-v1';
let reviewSelection=null;
function savedReviews(){try{return JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}')}catch{return {}}}
function reviewKey(place){return place.id||`${place.name}:${place.lat}:${place.lon}`}
function openReview(place){
 reviewSelection=place;$('#reviewFormArea').hidden=false;$('#reviewPlaceName').textContent=place.name;
 $('#reviewPlaceDetails').textContent=`${place.kind} · ${formatDistance(place.dist)}`;
 $('#reviewSaved').textContent='';
 const existing=savedReviews()[reviewKey(place)];
 document.querySelectorAll('input[name="reviewRating"]').forEach(x=>x.checked=x.value===existing);
 $('#reviewFormArea').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderReviewPlaces(){
 const places=[...nearbyState.places].sort((a,b)=>a.dist-b.dist);
 const slides=$('#reviewSlides'),results=$('#reviewSearchResults'),term=$('#reviewsSearch').value.trim().toLocaleLowerCase();
 slides.replaceChildren();results.replaceChildren();
 $('#reviewSlideCount').textContent=places.length?`${Math.min(5,places.length)} places`:'';
 for(const place of places.slice(0,5)){
   const card=document.createElement('button');card.type='button';card.className='review-slide';
   const rating=savedReviews()[reviewKey(place)];
   card.innerHTML=`<strong>${escapeText(place.name)}</strong><small>${escapeText(place.kind)} · ${formatDistance(place.dist)}</small>${rating?`<span>Your rating: ${escapeText(rating)}</span>`:'<span>Rate this place →</span>'}`;
   card.addEventListener('click',()=>openReview(place));slides.append(card);
 }
 if(!places.length){$('#reviewsStatus').textContent='Use your location to find public places.';return;}
 const matches=term?places.filter(p=>`${p.name} ${p.kind}`.toLocaleLowerCase().includes(term)):[];
 if(term&&!matches.length){results.textContent='No matching nearby places.';return;}
 for(const place of matches.slice(0,30)){
   const button=document.createElement('button');button.className='review-search-item';button.type='button';
   button.innerHTML=`<strong>${escapeText(place.name)}</strong><span>${escapeText(place.kind)} · ${formatDistance(place.dist)}</span>`;
   button.addEventListener('click',()=>openReview(place));results.append(button);
 }
}
async function loadReviewLocation(){
 if(nearbyState.loading){$('#reviewsStatus').textContent='Loading nearby places…';return;}
 if(nearbyState.position&&nearbyState.places.length){renderReviewPlaces();return;}
 if(!navigator.geolocation){$('#reviewsStatus').textContent='Location is not supported in this browser.';return;}
 $('#reviewsStatus').textContent='Getting your location…';
 $('#reviewsLocate').disabled=true;
 navigator.geolocation.getCurrentPosition(async pos=>{
   const position={lat:pos.coords.latitude,lon:pos.coords.longitude};nearbyState.position=position;
   try{nearbyState.places=await queryNearby(position);$('#reviewsStatus').textContent=nearbyState.places.length?`${nearbyState.places.length} public places found`: 'No nearby public places found';renderReviewPlaces()}
   catch(error){console.error(error);$('#reviewsStatus').textContent='Could not load places. Try again.'}
   finally{$('#reviewsLocate').disabled=false;}
 },()=>{$('#reviewsStatus').textContent='Allow location access to find nearby places.';$('#reviewsLocate').disabled=false;},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
}
$('#reviewsLocate').addEventListener('click',()=>{nearbyState.position=null;loadReviewLocation()});
$('#reviewsSearch').addEventListener('input',renderReviewPlaces);
$('#saveReview').addEventListener('click',()=>{
 if(!reviewSelection)return;
 const selected=document.querySelector('input[name="reviewRating"]:checked');
 if(!selected){$('#reviewSaved').textContent='Select a rating first.';return;}
 try{const existing=savedReviews();existing[reviewKey(reviewSelection)]=selected.value;localStorage.setItem(REVIEW_KEY,JSON.stringify(existing));$('#reviewSaved').textContent='Rating saved on this device.';renderReviewPlaces()}
 catch(error){$('#reviewSaved').textContent='Could not save rating. Check browser storage settings.';}
});
