# wssproxy-agent
A local proxy agent connecting to remote websocket proxy server. Abbreviated as wssagent

把远端的websocket加密代理服务器转换为本地的非加密普通代理服务器，简称为wssagent，支持CDN中转

支持DOH(DNS over https)，保护用户隐私


# 使用

需要先运行[pacproxy服务](https://github.com/httpgate/pacproxy.js) ， 运行后屏幕会显示 [WSSURL]

运行wssagent, 输入[WSSURL]

浏览器或者wifi设置代理服务器为 localhost , 代理端口为wssagent显示的端口, 就可以加密翻墙

也可以使用local pacurl来限制只一个浏览器翻墙，如只firefox翻墙可设置pacurl: http://localhost:[PROXY_PORT]/pac/firefox


# 运行

可下载直接点击[绿色可执行文件](https://github.com/httpgate/resouces/tree/main/wssproxy-agent)，或在命令行执行，按以下顺序加上可选参数:

node ./wssagent.js  [WSSURL]  [PROXY_PORT]  [-s]  [DOH_SERVER]  [WSSIP]  [CONNECT_DOMAIN]

nohup ./wssagent-linux  [WSSURL]  [PROXY_PORT]  [-s]  [DOH_SERVER]  [WSSIP]  [CONNECT_DOMAIN]

或编辑wssagent同一目录下的 [wss.env文件](wss.env)，设置运行参数

* Linux系统下的可执行文件只能在命令行下执行，除了[WSSURL]外其它参数不是必须输入

* 默认只本机能用代理，加 -s 可分享本机IP和端口给同一网段，其他参数说明见 [wss.env文件](wss.env)

* [WSSIP]是代理服务器的IP, 指定[WSSIP]将绕开DNS解析，避免域名劫持或DNS封锁

* 如[WSSURL]是直连pacproxy，可设置一个编造的域名[CONNECT_DOMAIN]，连接代理服务器时会自动替换[WSSURL]里的域名，以避开域名审查，隐藏真实域名。如果是CDN中转则不能用[CONNECT_DOMAIN]。编造域名需避开常见已知域名，尤其是已经被封锁的域名

* [WSSIP]并不需要绑定域名记录。很多VPS可以动态增加IP地址，新加的IP地址重启pacproxy服务后就可以用作[WSSIP]

* 如果同时指定了[WSSIP] 和 [DOH_SERVER]，连接时会用[WSSIP]连接服务器，但屏幕会显示[DOH_SERVER]解析域名的结果用于核对IP地址和DOH服务

手机用户参照[Android系统wssagent说明](\/example\/README\.md)


# 用途

* 很多软件不支持https加密的pacproxy代理， 用wssagent就可以在一台电脑上把pacproxy加密代理转换成普通代理，整个局域网都可以按普通方式代理上网

* 利用CDN中转突破封锁或加强隐私。CDN中转后proxy服务器不知道访问者的真实IP,CDN服务器不知道访问目标。如果海外的pacproxy服务器被封了。可以自己在cloudflare之类的支持websocket的CDN上注册一个账户, 并注册一个CDN域名， 指向远端的pacproxy服务器ip，SSL/TLS mode设置为FULL, 然后把[WSSURL]中的域名改成你CDN域名, 就又可以连上了。

* wssagent可以利用CDN转发，但会将加密proxy转成普通非加密代理。如果希望在某些不安全的设备或网络上，通过Firefox设置加密PAC URL实现端到端加密，可在参数[WSSURL]后加/pac, 在Firefox上设置带用户密码的PAC URL。 但需要本机hosts文件记录修改域名指向到wssagent的IP，或者用[nextdns](https://my.nextdns.io/login)修改dns指向。不建议将真实DNS指向wssagent的IP, 有数字证书被盗用的风险。

* 详情可参考[使用案例](https://github.com/httpgate/resources/blob/main/README.md)

# 安全

* 如果不信任中转流量的CDN, 则可以在CDN的[WSSURL]后面加 /tls , 此时穿越CDN的流量会加密，CDN不能探测你所访问的网站和内容，即使访问不加密的http网站对CDN也是不可知的。直连pacproxy服务器时一般不需要加/tls参数。

* 如果直连pacproxy时指定了[CONNECT_DOMAIN], 会略过服务器数字证书验证。为避免域名或IP劫持, 可在直连的[WSSURL]后面加 /tls , 会在tls加密连接时验证服务器的数字证书，确保连接到了真的pacproxy服务器。

* [WSSURL]后面加/pac 和 加/tls 一样，通过CDN中转时传输内容对CDN是加密的。如果使用编造域名[CONNECT_DOMAIN]直连也一样会验证数字证书避免域名或IP劫持。

* 由于常见的DOH服务经常会被封锁，所以能用[WSSIP]和本机hosts记录就尽量不用DOH, 需要用DOH或私有DNS服务时，可以[用CDN中转DOH服务](CDN_PROXY_DOH.md)，避免DOH服务封锁。

* 如果不信任pacproxy所运行的服务器， 则可以和无界，自由门混合使用。将无界，自由门的代理端口设置为wssagent的端口，浏览器则设置为无界/自由门的端口。这样pacproxy并不知道你具体访问的内容，如原来连不上无界，自由门此时也可以连上。可能也可以用此方法收看限定在无界/自由门上收看的新唐人晚会等节目。


## 推荐

推荐用prcproxy安全的访问以下网站：
* 明慧网：https://www.minghui.org
* 干净世界：https://www.ganjing.com
* 神韵作品: https://shenyunzuopin.com
* 大法经书: https://www.falundafa.org
