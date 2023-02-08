#!/usr/bin/env node

//wss url like wss://site.domain/url
var wssurl = '';
//proxy server listening port，same as port in firefox proxy
var proxyport = 0 ;
var shareproxy = false;
var dohUrl = 'https://mozilla.cloudflare-dns.com/dns-query';
var dohnut = false;
var server = false;
var tlsserver = false;
var istls = false;

const net = require('net');
const tls = require('tls');
const WebSocket = require('ws');
const readline = require('readline-sync');
const dns = require('dns');
const { Dohnut } = require('dohnut');
const dnsServer = '127.0.0.1:51392';

function run(configs){
  if(configs) {
    wssurl = configs.wssurl;
    if('proxyport' in configs) proxyport = configs.proxyport;
    if('shareproxy' in configs) shareproxy = configs.shareproxy;
    if('dohUrl' in configs) dohUrl = configs.dohUrl;    
  }
  else if(process.argv[2]){
    wssurl = process.argv[2];

    if(process.argv[3] && !isNaN(process.argv[3])) proxyport = process.argv[3];
    
    if(process.argv[4] && (process.argv[4].toLowerCase()=='-s')) shareproxy = true;

    if(process.env.shareproxy) shareproxy = true;

    if(process.argv[5] && (process.argv[5].toLowerCase().startsWith('https://'))) dohUrl = process.argv[5];

    if(process.env.dohurl) dohUrl = process.env.dohurl;

  } else {
    wssurl = readline.question('\r\nInput websocket wss url:');
    if((!wssurl) || (!wssurl.toLowerCase().startsWith('wss://'))) return readline.question('\r\nivalid websocket wss url[ok]');

    let inport = readline.question('\r\nInput proxy port [Random]:');
    if(inport && (!isNaN(inport))) proxyport = inport;

    let inshare = readline.question('\r\nShare proxy with others? [No]:');
    if(inshare && (inshare.toLowerCase().startsWith('y'))) shareproxy = true;

    let indoh = readline.question('\r\ninput DOH provider ['+dohUrl +']:\r\n');
    if(indoh && (indoh.toLowerCase().startsWith('https://'))) dohUrl = indoh;
  }

  var configuration = {
    dns: [{ type: 'udp4', addres: '127.0.0.1', port: 51392 }],
    doh: [{ uri: dohUrl }],
    bootstrap : '1.1.1.1',
    countermeasures : ''
  }
  dohnut = new Dohnut(configuration)
  start();
}


function start() {
  if((!wssurl) || (!wssurl.toLowerCase().startsWith('wss://'))) return console.log('invalid wssurl');
  if(!wssurl.toLowerCase().endsWith('/tls')) return connect();

  istls = true;
  let vshare = shareproxy;
  let vport = proxyport;
  shareproxy = false;
  proxyport = 0;
  connect();

  tlsserver = net.createServer(function(socket) {
    socket.setTimeout(60*1000+800);
    let upstream = tls.connect(server.address().port, '127.0.0.1', {rejectUnauthorized: false});
    socket.on('end', () => upstream.destroy());
    socket.on('error', () => upstream.destroy());
    upstream.on('end', () => socket.destroy());
    upstream.on('error', () => socket.destroy());
    socket.pipe(upstream).pipe(socket);
  });

  tlsserver.on('error', (err) => {
    console.log('\r\n tls server error '+ err);
  })

  if(vshare){
    tlsserver.listen(vport, ()=>console.log('\r\nwssagent tls serve in port : ' + tlsserver.address().port));
  } else {
    tlsserver.listen(vport, '127.0.0.1', ()=>console.log('\r\nwssagent tls serve in port : ' + tlsserver.address().port));
  }

}

async function connect() {  
  await dohnut.start()
  dns.setServers([dnsServer]);

  server = net.createServer(c => {
      c.setTimeout(60*1000+500);

      const ws = new WebSocket(wssurl)
      ws.on('close', () => c.destroy())
      ws.on('error', () => c.destroy())
      c.on('end', () => ws.close(1000))
      c.on('error', () => ws.close(1000))

      ws.on('open', () => c.on('data', data => ws.send(data)))
      ws.on('message', data => {
        if (!c.destroyed)
          c.write(data)
      })
  })

  server.on('error', (err) => {
    console.log('\r\n server error '+ err);
  })

  let cb = {};
  if(!istls) cb = ()=>console.log('\r\nwssagent serve in port : ' + server.address().port);

  if(shareproxy){
    server.listen(proxyport, cb);
  } else {
    server.listen(proxyport, '127.0.0.1', cb);
  }
}

if(process.argv[1].includes(__filename)) run();

exports.run = run;