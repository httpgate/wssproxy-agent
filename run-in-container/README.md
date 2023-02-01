# 安装

* Android手机安装nodejs容器APP：[dory-node.js](https://play.google.com/store/apps/details?id=io.tempage.dorynode) , 这相当于android上一个nodejs的docker容器, 可以[直接下载apk安装](https://github.com/tempage/dorynode)
* 在app右上角选 git clone , 输入: https://github.com/httpgate/wssproxy-agent , 文件夹选择 Download , 以避免权限冲突
* 在app右下角选 + Add File , 选 Download\wssproxy-agent\run-in-container\wssagent.js , 就会出现一个任务栏， 可以运行，停止，编辑
* 修改参数并保存，点运行按钮开始运行。
* 在app左上角可以设置 开机自动运行，锁定休眠，锁定wifi连接 等

# 使用

* Android要安装[firefox nightly build](https://play.google.com/store/apps/details?id=org.mozilla.fenix )（可[下载apk自己安装](https://www.apkmirror.com/apk/mozilla/firefox-fenix))， 

* 在Firefox地址栏中输入about:config，在出现的搜索框中，键入proxy点搜索按钮。从下面列出的相关选项中，找到network.proxy.type更改为2，找到network.proxy.http更改为localhost, 找到network.proxy.http_port更改为设置的端口.