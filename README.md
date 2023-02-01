# wssproxy-agent
A local proxy agent connecting to remote websocet proxy server

把远端的websocket加密代理服务器映射为本地的非加密普通代理服务器

采用DOH(DNS over https)保护用户隐私

# 运行

可下载直接点击[绿色可执行文件](https://github.com/httpgate/resouces/tree/main/wssproxy-agent)，或加上可选命令行参数。默认只本机能用代理，加-s可分享本机IP和端口给同一网段：

node ./wssagent.js [wssurl] [proxy-port] [-s] [DOH-Url]

./wssagent-linux [wssurl] [proxy-port] [-s] [DOH-Url]

Linux系统下的可执行文件只能在命令行下执行，除了wssurl外其它参数不是必须输入

手机用户参照[Android系统wssagent说明]((\/run-in-container\/README_EN\.md))

# 使用

获得wssurl, 和"pac url"的区别是把 https 改成 wss 

运行wssagent

浏览器设置代理服务器为 localhost 代理端口为 wssagent 显示的端口


# 用途

很多软件不支持https加密的pac代理， 用wssagent就可以在一台电脑上把加密代理变成普通代理，整个局域网都可以按普通方式代理上网

如果海外的pacproxy服务器被封了，这有可能是IP被封了，或者域名被封了。这时你可以自己注册一个域名，在cloudflare之类的支持websocket的CDN上注册一个账户， 再在CDN上把这个域名指向你远端的pacproxy服务器，这时就又可以上网了。

这时域名变成了你注册的域名，但域名后面的url还是原来的pacproxy的url, 就可以连上了。enjoy and, 法轮大法好，真善忍好。