
//修改下面冒号:右边的参数并保存
var configs = 
{
    //wssurl格式: 'wss://site.domain/url'
        wssurl : '' ,
    //代理服务端口号，如果为0则随机生成，并在屏幕显示端口号
        proxyport : 0 ,
    //设置为 true 可以分享代理给局域网内的其他电脑，默认是 false, 只有localhost可以访问代理
        shareproxy : false ,
    //wss服务器IP地址格式：'xxx.xxx.xxx.xxx'，指定该IP则wssurl里的域名可以为任意域名以避开域名审查，并隐藏真实域名
        wssip : ''
} ;

import * as wssagent from '../wssagent.js';
wssagent.run(configs);