
//修改下面:右边的参数并保存
var configs = 
{
    //wss url格式： wss://site.domain/url
        wssurl : '' ,
    //代理服务端口号，如果为0则随机生成，并在屏幕显示端口号
        proxyport : 0 ,
    //设置为 true 可以分享代理给局域网内的其他电脑，默认是 false, 只有localhost可以访问代理
        shareproxy : false ,
    //DNS over HTTPS 的服务url，可以替换成其他的
        dohUrl : 'https://mozilla.cloudflare-dns.com/dns-query'
} ;
    

require('../wssagent.js').run(configs);