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
const defaultDohIps = ['104.16.249.249', '104.16.248.249'];

//wss url like wss://site.domain/url
var wssurl = '';
//wssagent listening port，also proxy port in firefox settings
var proxyport = 0 ;
//proxy servr ip address
var wssip = '';
//share proxy in local network
var shareproxy = false;
//DOH(DNS Over Https) server domain
var dohServer = 'mozilla.cloudflare-dns.com';
//connect Domain will replace domain in wssurl when connecting to proxy
var connectDomain = '';

var dohips = false;
var wssips = [];
var server = false;
var tlsserver = false;
var istls = false;
var random = 0;
var nextResolveTime = Date.now();
var dohfailtime = 0;
var wssDomain = '';

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandom(arr) {
  if(!arr) return false;
  if(!Array.isArray(arr)) return false;
  if(arr.length==0) return false;
  if(arr.length==1) return arr[0];
  random++;
  if(random>=513) random=0;
  let choice = random % arr.length ;
  return arr[choice];
}

function localhostLookup(hostname, opts, cb) {
  cb(null, '127.0.0.1', 4);
}

function dohLookup(hostname, opts, cb) {
  if(dohips) return cb(null, getRandom(dohips), 4);

  dnsPromises.resolve4(hostname)
  .then((ips)=>{
    dohips = ips;
    cb(null, getRandom(ips), 4);
  })
  .catch((error)=>{
    console.log('boost dns error:' +error);
    dnsPromises.lookup(hostname, {family: 4, all: true})
    .then((ips)=>{
      dohips = ips.map(ip => ip.address );
      cb(null, getRandom(dohips), 4);
    })
    .catch((error)=>{
      if(dohServer == 'mozilla.cloudflare-dns.com'){
        dohips = defaultDohIps;
        return cb(null, getRandom(dohips), 4);        
      }
      console.log('local dns error:' + error);
      console.log('\r\n DOH (DNS over https) Server %s not found, specifiy another DOH server domain, or specify proxy server IP', dohServer);
    });
  });
}

function dohResolve(host) {
  let buf = dnsPacket.encode({
    type: 'query',
    id: getRandomInt(1, 65534),
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [{
      type: 'A',
      name: host
    }]
  })
  
  let options = {
    hostname: dohServer,
    port: 443,
    path: '/dns-query',
    method: 'POST',
    headers: {
      'Content-Type': 'application/dns-message',
      'Content-Length': Buffer.byteLength(buf)
    },
    lookup: dohLookup
  }

  return new Promise(function(resolve, reject) {
    let request = https.request(options, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('statusCode=' + res.statusCode));
      }

      res.on('data', (d) => {
        let data = dnsPacket.decode(d);
        if(!data.answers) reject('DOH: wrong dns data');
        if(data.answers.length==0) reject('DOH: invalid server domain ' + host);
        resolve(data.answers.filter(answer => {return answer.type=='A'} ));
      });
    })
    
    request.on('error', (e) => {
      reject('DOH: ' + e);
    });

    request.write(buf);
    request.end();
  });
}

function wssLookup(hostname, opts, cb) {
  if(wssip) return cb(null, wssip, 4); 
  if(wssips.length>0){
    cb(null, getRandom(wssips), 4);
    if(!dohips) return;
    if(dohfailtime>5) return;
    if(Date.now()<nextResolveTime) return;
  }
  nextResolveTime = Date.now() + getRandomInt(300,900)*1000;
  dohResolve(hostname)
  .then( answers => {
      dohfailtime = 0;
      let wssipsize = wssips.length;
      answers.forEach(answer => {
        if(wssips.some(ip => ip==answer.data)) return;
        wssips.push(answer.data);
        console.log('\r\nDOH Got Proxy Server IP:' + answer.data );
      });
      if(wssipsize==0) cb(null, getRandom(wssips), 4); 
  })
  .catch(err => {
    dohfailtime++;
    if(wssips.length!=0) return console.log(err);
    else if(dohfailtime<5) return console.log(err);
    dnsPromises.resolve4(hostname)
    .then( ips =>{
      wssips = ips;
      cb(null, getRandom(ips), 4);
      console.log('\r\nWARNING!!! DOH DNS failed, switich to normal DNS, your proxy real domain might be exposed!');
      console.log('\r\n' + err);
      ips.forEach(ip => console.log('\r\nDNS Got Proxy Server IP:' +ip));
    })
    .catch( error =>{
      console.log(err);
      console.log(error);
      console.log('\r\nPlease specify WSSIP, or use a different WSSURL');
    });
  });
}

dnsPromises.setServers(['1.1.1.1', '8.8.8.8', '208.67.222.222', '8.8.4.4', '208.67.220.220']);
require('dotenv').config();

function run(configs){
  if(configs) {
    wssurl = configs.wssurl;
    if('proxyport' in configs) proxyport = configs.proxyport;
    if('shareproxy' in configs) shareproxy = configs.shareproxy;
    if(configs.wssip) wssip = configs.wssip;
    if(configs.dohServer) dohServer = configs.dohServer;
    if(configs.connectDomain) connectDomain = configs.connectDomain;
  }
  else if(process.argv[2]){
    wssurl = process.argv[2];

    if(process.argv[3] && !isNaN(process.argv[3])) proxyport = process.argv[3];
    else if(process.env.PROXY_PORT) proxyport = process.env.PROXY_PORT;
    
    if(process.argv[4] && (process.argv[4].toLowerCase()=='-s')) shareproxy = true;
    else if(process.env.SHARE_PROXY) shareproxy = true;

    let inip='';
    if(process.argv[5]) inip=process.argv[5];
    if(inip && ipv4.isFormat(inip.trim()))  wssip = inip.trim();
    else if(inip) dohServer = inip.trim();
    else if(process.env.DOH_SERVER) dohServer = process.env.DOH_SERVER;

    if((!wssip) && process.env.WSSIP) wssip = process.env.WSSIP;

    if(process.argv[6]) connectDomain = process.argv[6];
    else if(process.env.CONNECT_DOMAIN) connectDomain = process.env.CONNECT_DOMAIN;

  } else if(process.env.WSSURL) {
    wssurl = process.env.WSSURL;
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
    else if(process.env.DOH_SERVER) dohServer = process.env.DOH_SERVER;
    else{
      let inip = readline.question('\r\nInput DOH server domain, or proxy server ip address [Skip]: ');
      if(inip && ipv4.isFormat(inip.trim()))  wssip = inip.trim();
      else if(inip) dohServer = inip.trim();
    }

    if(wssip){
      let inconndomain = readline.question('\r\nIf directly connect to proxy server (not CDN), Input a Connect Domain to avoid SNI-based HTTPS Filtering, \r\nand hide real domain [Skip]: ');
      if(inconndomain) connectDomain = inconndomain;
    }
  }
  console.log('\r\nDOH Server：' + dohServer);

  if((!wssurl) || (!wssurl.toLowerCase().startsWith('wss://'))) return console.log('invalid wssurl');

  let url = new URL(wssurl);
  wssDomain = url.host;
  if(wssip && connectDomain){
    url.host = connectDomain;
    wssurl = url.toString();
  }

  start();
}

function start() {
  if(!wssurl.toLowerCase().endsWith('/tls')) return connect();

  istls = true;
  let vshare = shareproxy;
  let vport = proxyport;
  shareproxy = false;
  proxyport = 0;
  connect();

  tlsserver = net.createServer(function(socket) {
    socket.setTimeout(60*1000+800);

    let connOptions = {lookup : localhostLookup, rejectUnauthorized: false};
    if(wssip) connOptions = {lookup : localhostLookup}

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
      c.setTimeout(60*1000+500);

      let connOptions = {lookup : wssLookup};
      if(wssip && connectDomain) connOptions = {lookup : wssLookup, rejectUnauthorized: false}

      const ws = new WebSocket(wssurl, connOptions);
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

exports.run = run ;
