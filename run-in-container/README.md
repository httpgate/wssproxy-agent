# 安装

* Android手机安装nodejs容器APP：[dory-node.js](https://play.google.com/store/apps/details?id=io.tempage.dorynode) , 这相当于android上一个nodejs的docker容器, 可以[直接下载apk安装](https://apkpure.com/dory-node-js-git-ssh-server/io.tempage.dorynode)
* 在app右上角选 git clone , 输入: https://github.com/httpgate/wssproxy-agent , 文件夹选择 Download , 以避免权限冲突
* 在app右下角选 + Add File , 选 Download\wssproxy-agent\run-in-container\wssagent.js , 就会出现一个任务栏， 可以运行，停止，编辑
* 修改参数并保存，点运行按钮开始运行。
* 在app左上角可以设置 开机自动运行，锁定休眠，锁定wifi连接 等

# 使用

* 可设置在手机wifi的proxy里，域名填localhost, 端口填wssagent设置或显示的端口. 也可以仅在 Firefox设置代理，如下所示：

* Android要安装[firefox nightly build](https://play.google.com/store/apps/details?id=org.mozilla.fenix )（可[下载apk自己安装](https://www.apkmirror.com/apk/mozilla/firefox-fenix))， 

* 在Firefox地址栏中输入about:config，在出现的搜索框中，键入proxy点搜索按钮。从下面列出的相关选项中，找到network.proxy.type更改为1，找到network.proxy.http和network.proxy.ssl，更改为localhost。 找到network.proxy.http_port和network.proxy.ssl_port, 更改为设置的端口. network.proxy.allow_bypass 改为 false.

* 将firefox的默认搜索引擎改为google. 中国大陆默认是baidu, 要改成google.