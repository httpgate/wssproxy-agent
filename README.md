# wssproxy-agent
A local proxy agent connecting to remote websocket proxy server

把远端的websocket加密代理服务器映射为本地的非加密普通代理服务器

采用DOH(DNS over https)保护用户隐私


# 使用

需要先运行[pacproxy服务](https://github.com/httpgate/pacproxy.js) ， 运行后屏幕会显示 wssurl

运行wssagent, 输入wssurl

浏览器或者wifi设置代理服务器为 localhost , 代理端口为wssagent显示的端口, 就可以加密翻墙

也可以使用local pac url来限制只一个浏览器翻墙，如只firefox翻墙可设置pac url: http://localhost:[proxyport]/pac/firefox


# 运行

可下载直接点击[绿色可执行文件](https://github.com/httpgate/resouces/tree/main/wssproxy-agent)，或在命令行执行，加上可选参数:

node ./wssagent.js [wssurl] [proxy-port] [-s] [wssip]

./wssagent-linux [wssurl] [proxy-port] [-s] [wssip]

* Linux系统下的可执行文件只能在命令行下执行，除了wssurl外其它参数不是必须输入

* 默认只本机能用代理，加 -s 可分享本机IP和端口给同一网段：

* 如指定wssip，则wssurl里的域名可以为任意域名以避开域名审查，并隐藏真实域名

手机用户参照[Android系统wssagent说明](\/run-in-container\/README\.md)


# 用途

* 很多软件不支持https加密的pacproxy代理， 用wssagent就可以在一台电脑上把pacproxy加密代理转换成普通代理，整个局域网都可以按普通方式代理上网

* 如果海外的pacproxy服务器被封了，这有可能是IP被封了，或者域名被封了。这时你可以自己[注册一个域名](https://github.com/httpgate/pacproxy.js/blob/main/documents/About_Domain_ZH.md)，在cloudflare之类的支持websocket的CDN上注册一个账户， 再在CDN上把这个域名指向你远端的pacproxy服务器，然后把wssurl中的域名改成你注册的域名, 就又可以连上了。enjoy and, 法轮大法好，真善忍好。


# 安全

* 如果不信任中转流量的CDN, 则可以在CDN的wss url后面加/tls , 此时穿越CDN的流量会加密，CDN不能探测你所访问的网站和内容，即使访问不加密的http网站对CDN也是不可知的。直连pacproxy服务器时不需要加/tls参数。

* 如果不信任pacproxy所运行的服务器， 则可以和无界，自由门混合使用。将无界，自由门的代理端口设置为wssagent的端口，浏览器则设置为无界/自由门的端口。这样pacproxy并不知道你具体访问了哪些网站，如原来连不上无界，自由门此时也可以连上。