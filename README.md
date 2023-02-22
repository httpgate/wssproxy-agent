# wssproxy-agent
A local proxy agent connecting to remote websocket proxy server. Abbreviated as wssagent

把远端的websocket加密代理服务器映射为本地的非加密普通代理服务器，简称为wssagent

支持DOH(DNS over https)，保护用户隐私


# 使用

需要先运行[pacproxy服务](https://github.com/httpgate/pacproxy.js) ， 运行后屏幕会显示 [WSSURL]

运行wssagent, 输入[WSSURL]

浏览器或者wifi设置代理服务器为 localhost , 代理端口为wssagent显示的端口, 就可以加密翻墙

也可以使用local pacurl来限制只一个浏览器翻墙，如只firefox翻墙可设置pacurl: http://localhost:[PROXY_PORT]/pac/firefox


# 运行

可下载直接点击[绿色可执行文件](https://github.com/httpgate/resouces/tree/main/wssproxy-agent)，或在命令行执行，按以下顺序加上可选参数:

node ./wssagent.js  [WSSURL]  [PROXY_PORT]  [-s]  [DOH_SERVER]  [WSSIP]  [CONNECT_DOMAIN]

./wssagent-linux  [WSSURL]  [PROXY_PORT]  [-s]  [DOH_SERVER]  [WSSIP]  [CONNECT_DOMAIN]

或编辑wssagent同一目录下的 [wss.env文件](\wss.env)，设置运行参数

* Linux系统下的可执行文件只能在命令行下执行，除了[WSSURL]外其它参数不是必须输入

* 默认只本机能用代理，加 -s 可分享本机IP和端口给同一网段，其他参数说明见 [wss.env文件](\wss.env)

* [WSSIP]是代理服务器的IP, 指定[WSSIP]将绕开DNS解析，避免域名劫持或DNS封锁

* 如[WSSIP]是直连IP，可设置一个编造的域名[CONNECT_DOMAIN]，连接代理服务器时会自动替换[WSSURL]里的域名，以避开域名审查，隐藏真实域名。如果是CDN中转IP则不能用[CONNECT_DOMAIN]。编造域名需避开常见已知域名，尤其是已经被封锁的域名

手机用户参照[Android系统wssagent说明](\/run-in-container\/README\.md)


# 用途

* 很多软件不支持https加密的pacproxy代理， 用wssagent就可以在一台电脑上把pacproxy加密代理转换成普通代理，整个局域网都可以按普通方式代理上网

* 如果海外的pacproxy服务器被封了，这有可能是IP被封了，或者域名被封了。这时你可以自己[注册一个域名](https://github.com/httpgate/pacproxy.js/blob/main/documents/About_Domain_ZH.md)，在cloudflare之类的支持websocket的CDN上注册一个账户， 再在CDN上把这个域名指向你远端的pacproxy服务器，然后把wssurl中的域名改成你注册的域名, 就又可以连上了。enjoy and, 法轮大法好，真善忍好。


# 安全

* 如果不信任中转流量的CDN, 则可以在CDN的[WSSURL]后面加 /tls , 此时穿越CDN的流量会加密，CDN不能探测你所访问的网站和内容，即使访问不加密的http网站对CDN也是不可知的。直连pacproxy服务器时一般不需要加/tls参数。

* 如果直连pacproxy时指定了[WSSIP]和[CONNECT_DOMAIN], 会略过服务器数字证书验证。为避免IP劫持（虽然比较少见）, 可在直连的[WSSURL]后面加 /tls , 会在tls加密连接时验证服务器的数字证书，确保连接到了真的pacproxy服务器。

* 如果不信任pacproxy所运行的服务器， 则可以和无界，自由门混合使用。将无界，自由门的代理端口设置为wssagent的端口，浏览器则设置为无界/自由门的端口。这样pacproxy并不知道你具体访问了哪些网站，如原来连不上无界，自由门此时也可以连上。