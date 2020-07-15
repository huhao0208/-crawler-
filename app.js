const cheerio = require('cheerio')
// 获取html 文档相关内容 获取方式跟jq一样
const fs = require('fs')

const axios = require('axios')
// const Url = require('url')
const path = require('path')

const { agentList } = require('./userAgent')

const meizi_headers = [
    "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:30.0) Gecko/20100101 Firefox/30.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.75.14 (KHTML, like Gecko) Version/7.0.3 Safari/537.75.14",
    "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)",
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11',
    'Opera/9.25 (Windows NT 5.1; U; en)',
    'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
    'Mozilla/5.0 (compatible; Konqueror/3.5; Linux) KHTML/3.5.5 (like Gecko) (Kubuntu)',
    'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.0.12) Gecko/20070731 Ubuntu/dapper-security Firefox/1.5.0.12',
    'Lynx/2.8.5rel.1 libwww-FM/2.14 SSL-MM/1.4.1 GNUTLS/1.2.9',
    "Mozilla/5.0 (X11; Linux i686) AppleWebKit/535.7 (KHTML, like Gecko) Ubuntu/11.04 Chromium/16.0.912.77 Chrome/16.0.912.77 Safari/535.7",
    "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:10.0) Gecko/20100101 Firefox/10.0",
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36 Edge/18.18362'
]


let loData = {
    pageNumber: 1,
    lIndex: 0,
    i: 1,
}

axios.interceptors.request.use(config => {
    // let headIndex = Math.floor(Math.random() * meizi_headers.length)
    // // config.headers['User-Agent'] = meizi_headers[headIndex]
    // // if(!config.headers['User-Agent']){
    // //     config.headers['User-Agent'] = meizi_headers[headIndex]
    // // }
    return config
})

// 缓存信息
function localData({ type = "get", success = _ => { }, data = {} }) {
    fs.readFile('./log.json', 'utf-8', (err, data1) => {
        // console.log(err);
        if (err) return fs.createWriteStream('./log.json', 'utf-8')
        //  console.log(JSON.parse(data1));
        data1 = JSON.parse(data1)
        if (type == 'get') {
            success(data1)
        } else {
            let obj = {
                ...data1,
                ...data
            }
            fs.writeFile("./log.json", JSON.stringify(obj), error => {
                if (error) return console.log("写入文件失败,原因是" + error.message);
                success(obj)
            });
        }
    })
}
// 创建images文件夹
if (!fs.existsSync('./images')) {
    fs.mkdir('./images', err => {
        console.log('images 文件夹创建失败');
    })
}

let pageTotal = 0


function getUrl() {

    axios.get('https://www.mzitu.com/page/' + loData.pageNumber + '/')
        .then(res => {
            // cheerio 解析res
            let $ = cheerio.load(res.data)
            // 获取总页码
            let pagelist = $('.main-content .pagination  .page-numbers')
            pageTotal = $(pagelist[pagelist.length - 2]).text()
            console.log(`页面下载进度: ${loData.pageNumber}/${pageTotal}`);
            if (loData.pageNumber > pageTotal) {
                console.log('所有图片下载完毕');
                return
            }
            // 获取当前页分类链接
            const list = $('#pins li>a')
            // let i = loData.index
            function fn() {
                if (loData.lIndex > list.length) {
                    console.log(`第${loData.pageNumber}页下载完毕`);
                    loData.pageNumber = loData.pageNumber / 1 + 1
                    console.log(`开始下载第${loData.pageNumber}页`);
                    loData.lIndex = 0
                    loData.i = 1
                    getUrl()
                    return
                }

                let url = $(list[loData.lIndex]).attr('href')
                let fileName = $(list[loData.lIndex]).next().children('a').text()
                console.log(`当前在${loData.pageNumber}页,当前页下载进度:${loData.lIndex}/${list.length}`);
                if (!url || !fileName) {
                    loData.lIndex++
                    fn()
                    return
                }
                parsePage(url, fileName, _ => {
                    loData.lIndex++;
                    loData.i = 1

                    fn()
                })
            }
            fn()
        })

}



// 解析url 
async function parsePage(url, title, callback, page = loData.i) {
    loData.i = page
    localData({
        type: 'set',
        data: loData
    })
    if (!url) return callback(true)
    const {
        data
    } = await axios({
        method: 'GET',
        url: url + '/' + page,
        headers: {
            Referer: 'https://www.mzitu.com/'
        }
    })
    let $ = cheerio.load(data)
    //   console.log(data);
    $(".main-image>p>a>img").each((i, item) => {
        //  console.log($(item).attr('src'));
        // 先下载当前分类 下载完毕后再调用callback
        // 获取当前分类总页码
        let pages = $('.content .pagenavi a>span')
        let total = $(pages[pages.length - 2]).text()
        if (page > total) {
            console.log(title + '下载完毕,准备下载下一分类,当前页面进度:' + loData.pageNumber + '/' + pageTotal);
            callback(true)
            return
        }
        //创建分类文件夹
        fs.mkdir('./images/' + title, err => {
            if (err) {
                //检查是否有文件夹 有则继续 
                if (!fs.existsSync('./images/' + title)) return console.log(title + '文件夹创建失败');
                // 没有再次创建
                fs.mkdir('./images/' + title, _ => { })
            }

            let timer = setTimeout(() => {
                downloadImg($(item).attr('src'), url, title, loaded => {
                    // 展示下载进度
                    console.log(`${title.substr(0, 5)}...  下载进度: ${page}/${total}`);
                    page++;
                    parsePage(url, title, callback, page)
                })
                clearTimeout(timer)
                timer = null
            }, Math.floor(Math.random() * 1000))
        })
    })
}

// 下载
async function downloadImg(imgUrl, Referer, title, callback1) {

    const imageName = path.parse(imgUrl).base
    const {
        data
    } = await axios({
        url: imgUrl,
        type: "GET",
        headers: {
            Referer,
            'User-Agent': agentList[Math.floor(Math.random() * 2000)]
        },
        responseType: 'stream'
    })

    // 流 写入
    data.pipe(fs.createWriteStream('./images/' + title + '/' + imageName))

    // 随机时间延时 防止被拒绝
    // let timer = setTimeout(() => {
    callback1(true)
    //  console.log('下载完毕:' + imageName);
    // clearTimeout(timer)
    // }, Math.floor(Math.random() * 1000))


}

// 先获取缓存信息
localData({
    type: 'get',
    success: e => {

        loData = {
            ...loData,
            ...e
        }
        // 开始
        getUrl()
    }
})
