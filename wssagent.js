#!/usr/bin/env node
'use strict'

const net = require('net');
const tls = require('tls');
const WebSocket = require('ws');
const readline = require('readline-sync');
const dnsPromises = require('dns').promises;
const https = require('https');
const dnsPacket = require('dns-packet')
const ipv4 = require('@leichtgewicht/ip-codec').v4;
const path = require('path');
const httpsagent = https.Agent({keepAlive: true, timeout: 300000, maxCachedSessions: 1000 });

//wss url like wss://site.domain/url
var wssurl = '';
//wssagent listening port，also proxy port in firefox settings
var proxyport = 0 ;
//proxy servr ip address
var wssip = '';
//share proxy in local network
var shareproxy = false;
//DOH(DNS Over Https) server domain
var dohServer = '';
//connect Domain will replace domain in wssurl when connecting to proxy
var connectDomain = '';

var dohips = false;
var wssips = [];
var server = false;
var tlsserver = false;
var random = 0;
var wssDomain = '';
var dohurl = '';

function getRandom(arr) {
  if(!arr) return false;
  if(!Array.isArray(arr)) return arr;
  if(arr.length==0) return false;
  if(arr.length==1) return arr[0];
  random++;
  if(random>=513) random=0;
  let choice = random % arr.length ;
  return arr[choice];
}

function localhostLookup(hostname, opts, cb) {
  if(opts && opts.all)  cb(null, [{"address":'127.0.0.1', "family":4}]);  
  else    cb(null, '127.0.0.1', 4);  
}

function dohLookup(hostname, opts, cb) {
  if(opts && opts.all)  cb(null, [{"address":getRandom(dohips), "family":4}]);  
  else    cb(null, getRandom(dohips), 4);  
}

function wssLookup(hostname, opts, cb) {
  if(opts && opts.all)  cb(null, [{"address":getRandom(wssips), "family":4}]);  
  else    cb(null, getRandom(wssips), 4);  
}

function toRFC8484 (buffer) {
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function dohResolve(host) {
  const packet = dnsPacket.encode({
    type: 'query',
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [{
      type: 'A',
      name: host
    }]
  })

  let vserver = dohServer;
  let vpath = '/dns-query'; 
  if(dohServer.toLocaleLowerCase().startsWith('https')){
    const parsed = new URL(dohServer);
    vserver = parsed.host;
    vpath = parsed.pathname;
    console.log(vpath);
  }
  const pth = vpath + '?dns=' + toRFC8484(packet);
  const options = {
    hostname: vserver,
    port: 443,
    path: pth,
    method: 'GET',
    headers: {
      'Content-Type': 'application/dns-message',
    },
    timeout: 1000,
    lookup: dohLookup
  }

  await dnsPromises.resolve4(vserver)
  .then((ips)=>{
    dohips = ips;
  })
  .catch((error)=>{
    console.log('DOH: ' + error);
  });

  return new Promise(function(resolve, reject) {
    if(!dohips.length)  reject('DOH: DOH Server DNS error');
    let request = https.get(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('DOH statusCode=' + res.statusCode));
      }

      res.on('data', (d) => {
        let data = dnsPacket.decode(d);
        if(!data.answers) reject('DOH: wrong dns data');
        if(data.answers.length==0) reject('DOH: no dns record for domain: ' + host);
        resolve(data.answers.filter(answer => {return answer.type=='A'} ));
      });

    })
    
    request.on('error', (e) => {
      reject('DOH: ' + e);
    });
    
  });
}

dnsPromises.setServers(['1.1.1.1', '8.8.8.8', '208.67.222.222', '8.8.4.4', '208.67.220.220']);

const envpath = path.resolve(process.cwd(), 'wss.env');
require('dotenv').config({path: envpath});

async function run(configs){
  if(configs) {
    wssurl = configs.wssurl;
    if(!wssurl.toLowerCase().startsWith('wss://')) return console.log('invalid wssurl');
    if('proxyport' in configs) proxyport = configs.proxyport;
    if('shareproxy' in configs) shareproxy = configs.shareproxy;
    if(configs.wssip) wssip = configs.wssip;
    if(configs.dohServer) dohServer = configs.dohServer;
    if(configs.connectDomain) connectDomain = configs.connectDomain;
  }
  else if(process.argv[2]){
    wssurl = process.argv[2];
    if(!wssurl.toLowerCase().startsWith('wss://')) return console.log('invalid wssurl');
    let i=3;
    
    if(process.argv[i] && (!isNaN(process.argv[i]))) {
      proxyport = process.argv[i];
      i++;
    }
    else if(process.env.PROXY_PORT) proxyport = process.env.PROXY_PORT;
    
    if(process.argv[i] && (process.argv[i].toLowerCase()=='-s')) {
      shareproxy = true;
      i++;
    }
    else if(process.env.SHARE_PROXY) shareproxy = true;
    
    if(process.argv[i] && !ipv4.isFormat(process.argv[i].trim().split(',')[0])) {
      dohServer = process.argv[i].trim();
      i++;
    }
    else if(process.env.DOH_SERVER) dohServer = process.env.DOH_SERVER;

    if(process.argv[i] && ipv4.isFormat(process.argv[i].trim().split(',')[0])) {
      wssip = process.argv[i].trim();
      i++;
    }  
    else if(process.env.WSSIP) wssip = process.env.WSSIP;

    if(process.argv[i]) connectDomain = process.argv[i];
    else if(process.env.CONNECT_DOMAIN) connectDomain = process.env.CONNECT_DOMAIN;

  } else if(process.env.WSSURL) {
    wssurl = process.env.WSSURL;
    if(!wssurl.toLowerCase().startsWith('wss://')) return console.log('invalid wssurl');

    if(process.env.PROXY_PORT) proxyport = process.env.PROXY_PORT;
    if(process.env.SHARE_PROXY) shareproxy = true;
    if(process.env.WSSIP) wssip = process.env.WSSIP;
    if(process.env.DOH_SERVER) dohServer = process.env.DOH_SERVER;  
    if(process.env.CONNECT_DOMAIN) connectDomain = process.env.CONNECT_DOMAIN;
  
    console.log('\r\n Run as .env settings');
  } else {
    wssurl = readline.question('\r\nInput websocket wss url: ');
    if((!wssurl) || (!wssurl.toLowerCase().startsWith('wss://'))) return readline.question('\r\nivalid websocket wss url[ok]');

    if(process.env.PROXY_PORT) proxyport = process.env.PROXY_PORT;
    else{
      let inport = readline.question('\r\nInput proxy port [Random]: ');
      if(inport && (!isNaN(inport))) proxyport = inport;
    }

    if(process.env.SHARE_PROXY) shareproxy = true;
    else {
      let inshare = readline.question('\r\nShare proxy with others? [No]: ');
      if(inshare && (inshare.toLowerCase().startsWith('y'))) shareproxy = true;
    }

    if(process.env.WSSIP) wssip = process.env.WSSIP;
    else{
      let inip = readline.question('\r\nInput proxy server ip address (WSSIP) [Skip]: ');
      if(inip && ipv4.isFormat(inip.trim()))  wssip = inip.trim();
      else if(inip) wssip = inip.trim();
    }

    if(process.env.DOH_SERVER) dohServer = process.env.DOH_SERVER;
    else if(!wssip){
      let indoh = readline.question('\r\nInput DOH (DNS over Https) server domain [Skip]: ');
      if(indoh) dohServer = indoh.trim();
    }

    if(process.env.CONNECT_DOMAIN) connectDomain = process.env.CONNECT_DOMAIN;
    else if(wssip){
      let inconndomain = readline.question('\r\nIf directly connect to proxy server (not CDN), input a Connect Domain to avoid SNI-based HTTPS Filtering, \r\nand hide real domain [Skip]: ');
      if(inconndomain) connectDomain = inconndomain;
    }
  }

  if(wssip) wssips = wssip.split(',');

  console.log('\r\nShare Proxy: ' + shareproxy);
  console.log('\r\nDOH Server: ' + dohServer);
  console.log('\r\nWSSIP array: ' + JSON.stringify(wssips));
  console.log('\r\nConnect Domain: ' + connectDomain);

  let url = new URL(wssurl);
  wssDomain = url.host;
  if(wssip && connectDomain){
    url.host = connectDomain;
    wssurl = url.toString();
  }

if(dohServer) {
    await dohResolve(wssDomain)
    .then( answers => {
        let ips = answers.map(answer => answer.data );
        ips.forEach(ip => console.log('\r\nDOH Got Proxy Server IP (WSSIP): ' + ip));
        if(ips.length && !wssips.length) wssips = ips;
        if(dohServer.toLowerCase().startsWith('https')) dohurl = dohServer;
        else dohurl = 'https://' + dohServer + '/dns-query';
        console.log('\r\nDOH url (for Firefox): ' + dohurl);    })
    .catch(err => {
        console.log('\r\n' + err);
    });
  }

  if(wssips.length) return start();

  await dnsPromises.resolve4(wssDomain)
  .then( ips =>{
    wssips = ips;
    ips.forEach(ip => console.log('\r\nDNS Got Proxy Server IP (WSSIP): ' + ip));
  })
  .catch( error =>{
    console.log(error);
    console.log('\r\nPlease specify WSSIP, or use a different WSSURL');
    cb(error);
  });

  if(wssips.length) start();
}

function start() {
  if(wssurl.toLowerCase().endsWith('/pac')) return connect();
  else if(!wssurl.toLowerCase().endsWith('/tls')) return connect();

  let vshare = shareproxy;
  let vport = proxyport;
  shareproxy = false;
  proxyport = 0;
  connect();

  tlsserver = net.createServer(function(socket) {

    let connOptions = {lookup : localhostLookup, rejectUnauthorized: false};
    if(connectDomain) connOptions = {lookup : localhostLookup};

    let upstream = tls.connect(server.address().port, wssDomain, connOptions);
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

function connect() {  
  server = net.createServer(c => {

      let connOptions = {lookup : wssLookup, agent: httpsagent};
      if(wssip && connectDomain) connOptions = {lookup : wssLookup, agent: httpsagent, rejectUnauthorized: false} ;

      const ws = new WebSocket(wssurl, connOptions);
      const duplex = WebSocket.createWebSocketStream(ws);

      duplex.on('close', () => c.destroy())
      duplex.on('error', () => c.destroy())
      c.on('end', () => ws.close(1000))
      c.on('error', () => ws.close(1000))

      duplex.pipe(c);
      c.pipe(duplex);
  })

  server.on('error', (err) => {
    console.log('\r\n server error '+ err);
  })

  let cb = {};
  if(wssurl.toLowerCase().endsWith('/pac'))  cb = ()=>console.log('\r\nwssagent pac serve in port : ' + server.address().port);
  else if(!wssurl.toLowerCase().endsWith('/tls'))  cb = ()=>console.log('\r\nwssagent serve in port : ' + server.address().port);

  if(shareproxy){
    server.listen(proxyport, cb);
  } else {
    server.listen(proxyport, '127.0.0.1', cb);
  }
}

if(process.argv[1].includes(__filename)) run();

exports.run = run ;
