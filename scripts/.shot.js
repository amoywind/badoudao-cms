const { spawn } = require('child_process');
const path = require('path'), os = require('os');
const fs = require('fs');
const WebSocket = require('ws');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
(async () => {
  const port = 9959, out = process.argv[2], w = Number(process.argv[3]||1440), y = Number(process.argv[4]||0);
  const url = process.argv[5];
  const proc = spawn(EDGE, ['--headless=new','--disable-gpu','--hide-scrollbars','--no-sandbox',
    `--remote-debugging-port=${port}`,`--user-data-dir=${path.join(os.tmpdir(),'sh'+port)}`],{stdio:'ignore'});
  let wsUrl;
  for (let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/json/list`);const l=await r.json();const p=l.find(t=>t.type==='page');if(p?.webSocketDebuggerUrl){wsUrl=p.webSocketDebuggerUrl;break;}}catch{}await new Promise(r=>setTimeout(r,400));}
  const ws=new WebSocket(wsUrl);await new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});
  let id=0;const send=(m,p)=>new Promise((res,rej)=>{const hh=(raw)=>{const m2=JSON.parse(raw.toString());if(m2.id===id){ws.off('message',hh);m2.error?rej(new Error(m2.error.message)):res(m2.result);}};ws.on('message',hh);ws.send(JSON.stringify({id:++id,method:m,params:p}));});
  const ev=async e=>(await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
  await send('Page.enable',{});
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:900,deviceScaleFactor:1,mobile:w<500});
  await send('Page.navigate',{url});
  await new Promise(r=>setTimeout(r,8000));
  await ev(`(function(){ window.scrollTo(0, ${y}); return new Promise(function(r){setTimeout(r,900);}); })()`);
  const r = await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(out, Buffer.from(r.data,'base64'));
  console.log('saved', out, 'y=' + y);
  ws.close();try{process.kill(proc.pid);}catch{};process.exit(0);
})();
