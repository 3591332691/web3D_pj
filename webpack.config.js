const path = require('path');

module.exports = {
    entry: './nodeapps/blockland/app.js', // 入口文件
    output: {
        path: path.resolve(__dirname, 'dist'), // 输出目录
        filename: 'web3d.js' // 输出文件名
    },
    resolve: {
        fallback: {
            "http": require.resolve("stream-http"),
            "path": require.resolve("path-browserify"),
            "buffer": require.resolve("buffer/"),
            "url": require.resolve("url/"),
            "stream": require.resolve("stream-browserify"),
            "util": require.resolve("util/"),
            "querystring": require.resolve("querystring-es3"),
            "fs": false,
            "uws": false, // 或者使用 ws 模块代替
            "zlib": require.resolve("browserify-zlib"),
            "crypto": require.resolve("crypto-browserify"),
            "net": false,
            "assert": require.resolve("assert/"),
        }
    }
};
