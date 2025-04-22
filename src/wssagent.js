'use strict'

const net = require('net');
const tls = require('tls');
const WebSocket = require('ws');
const dnsPromises = require('dns').promises;
const https = require('https');
const dnsPacket = require('dns-packet')
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

async function run(configs){
  if(configs) {
    wssurl = configs.wssurl;
    if(!wssurl.toLowerCase().startsWith('wss://')) return console.log('invalid wssurl');
    if('proxyport' in configs) proxyport = configs.proxyport;
    if('shareproxy' in configs) shareproxy = configs.shareproxy;
    if(configs.wssip) wssip = configs.wssip;
    if(configs.dohServer) dohServer = configs.dohServer;
    if(configs.connectDomain) connectDomain = configs.connectDomain;
  } else {
    return console.log('invalid arguments');
  }

  if(wssip) wssips = wssip.split(',');

  console.log('\r\nShare Proxy: ' + shareproxy);
  console.log('\r\nDOH Server: ' + dohServer);
  console.log('\r\nWSSIP array: ' + JSON.stringify(wssips));
  console.log('\r\nConnect Domain: ' + connectDomain);

  let url = new URL(wssurl);
  wssDomain = url.host.split(":")[0];
  if(connectDomain){
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
      if(connectDomain) connOptions = {lookup : wssLookup, agent: httpsagent, rejectUnauthorized: false} ;

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

exports.run = run ;
