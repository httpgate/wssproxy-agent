#!/usr/bin/env node

//wss url like wss://site.domain/url
var wssurl = '';
//proxy server listening port，same as port in firefox proxy
var proxyport = 0 ;
var shareproxy = false;
var dohUrl = 'https://mozilla.cloudflare-dns.com/dns-query';

const net = require('net');
const WebSocket = require('ws');
const readline = require('readline-sync');
const dns = require('dns');
const { Dohnut } = require('dohnut');
const dnsServer = '127.0.0.1:51392';


function run(configs){
  if(configs) {
    wssurl = configs.url;
    proxyport = configs.proxyport;
    shareproxy = configs.shareproxy;
    dohUrl = configs.dohUrl;    
  }
  else if(process.argv[2]){
    wssurl = process.argv[2];

    if(process.argv[3] && !isNaN(process.argv[3])) proxyport = process.argv[3];
    
    if(process.argv[4] && (process.argv[4].toLowerCase()=='-s')) shareproxy = true;

    if(process.argv[5] && (process.argv[5].toLowerCase().startsWith('https://'))) dohUrl = process.argv[5];

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
  const dohnut = new Dohnut(configuration)
  start();
}


async function start() {
  if((!wssurl) || !(wssurl.toLowerCase().startsWith('wss://'))) return console.log('invalid wssurl');
  
  await dohnut.start()
  dns.setServers([dnsServer]);

  const server = net.createServer(c => {
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
    console.log('error');
  })

  if(shareproxy){
    server.listen(proxyport, ()=>console.log('\r\nwssagent serve in port : ' + server.address().port));
  } else {
    server.listen(proxyport, '127.0.0.1', ()=>console.log('\r\nwssagent serve in port : ' + server.address().port));
  }
}

if(process.argv[1].includes(__filename)) run();

exports.run = run;