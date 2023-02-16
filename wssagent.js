#!/usr/bin/env node

const net = require('net');
const tls = require('tls');
const url = require('url');
const WebSocket = require('ws');
const readline = require('readline-sync');
const Resolver = require('dns-over-http-resolver');
const resolver = new Resolver();

//wss url like wss://site.domain/url
var wssurl = '';
//wssagent listening port，also proxy port in firefox settings
var proxyport = 3128 ;
//wss servr ip address
var wssip = '';

var shareproxy = false;
var dohUrl = 'https://mozilla.cloudflare-dns.com/dns-query';
var server = false;
var tlsserver = false;
var istls = false;
var connOptions = {lookup : wsslookup};

function wsslookup(hostname, opts, cb) {
  if(wssip) return cb(null, wssip, 4); 
  resolver.resolve4(hostname)
  .then( ips => {
      wssip=ips[0];
      cb(null, wssip, 4); 
  })
  .catch(err => {
      console.log(err);
  });  
}

function run(configs){
  if(configs) {
    wssurl = configs.wssurl;
    if('proxyport' in configs) proxyport = configs.proxyport;
    if('shareproxy' in configs) shareproxy = configs.shareproxy;
    if(configs.wssip) wssip = configs.wssip;    
  }
  else if(process.argv[2]){
    wssurl = process.argv[2];

    if(process.argv[3] && !isNaN(process.argv[3])) proxyport = process.argv[3];
    
    if(process.argv[4] && (process.argv[4].toLowerCase()=='-s')) shareproxy = true;

    if(process.argv[5]) wssip=process.argv[5];

    if(process.env.shareproxy) shareproxy = true;
    if(process.env.wssip) wssip = process.env.dohurl;

  } else {
    wssurl = readline.question('\r\nInput websocket wss url:');
    if((!wssurl) || (!wssurl.toLowerCase().startsWith('wss://'))) return readline.question('\r\nivalid websocket wss url[ok]');

    let inport = readline.question('\r\nInput proxy port [Random]:');
    if(inport && (!isNaN(inport))) proxyport = inport;

    let inshare = readline.question('\r\nShare proxy with others? [No]:');
    if(inshare && (inshare.toLowerCase().startsWith('y'))) shareproxy = true;

    let inip = readline.question('\r\ninput wss server ip address:');
    if(inip)  wssip = indoh;
  }
  start();
}


function start() {
  if((!wssurl) || (!wssurl.toLowerCase().startsWith('wss://'))) return console.log('invalid wssurl');

  let dohservers = resolver.getServers();
  dohservers.unshift(dohUrl);
  resolver.setServers(dohservers);
  
  if(wssip) connOptions = {lookup : wsslookup, rejectUnauthorized: false}

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

function connect() {  

  server = net.createServer(c => {
      c.setTimeout(60*1000+500);

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
