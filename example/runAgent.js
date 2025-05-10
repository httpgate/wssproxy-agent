
//修改下面冒号:右边的参数并保存
var configs = 
{
    //必填，代理服务器Websocket url, 格式: 'wss://site.domain/url'
        wssurl : '' ,

    //必填，代理服务端口号，如果为0则随机生成，并在屏幕显示端口号
        proxyport : 0 ,

    //必填，设置为 true 可以分享代理给局域网内的其他电脑，默认是 false, 只有localhost可以访问代理
        shareproxy : false ,
        
    //可选，代理服务器IP地址, 格式：'xxx.xxx.xxx.xxx', 多个IP用英文小写逗号 , 隔开。指定IP可绕开DNS解析，避免域名劫持或DNS封锁
        wssip : '',

    //可选，连接域名，用此域名连接代理服务器，以避开域名审查，隐藏真实域名，不适用于CDN中转wssurl, 建议wssurl后加/tls避免ip域名劫持
        connectDomain : '',
        
    //可选，DOH(DNS Over Https)服务器域名, 如 'dns.cloudflare.com', 'doh.opendns.com', 'dns.google'
    //新版本也支持DOH URL, 如： 'https://cdn.nextcdn.io/youraccout'
        dohServer : 'mozilla.cloudflare-dns.com'

}

require('../src/wssagent.js').run(configs);