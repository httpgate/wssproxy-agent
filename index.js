#!/usr/bin/env node
'use strict'

const readline = require('readline-sync');
const path = require('path');
const dotenv = require('dotenv');
const ipv4 = require('@leichtgewicht/ip-codec').v4;

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


const envpath = path.resolve(process.cwd(), 'wss.env');
dotenv.config({path: envpath});

if(process.argv[2]){
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

const configs = {wssurl, proxyport, shareporxy, wssip, connectDomain, dohServer};
require('src/wssagent.js').run(configs);