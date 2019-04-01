
var WebpackDevServer =  require("webpack-dev-server");
var webpack =require ('webpack');
var webpackConfig= require('./webpack');
const proxyPort = 3434;
webpackConfig.output.path="/artifacts/public";
    const server = new WebpackDevServer(webpack(webpackConfig), {
        contentBase: __dirname,
        hot: true,
        quiet: false,
        noInfo: false,
        publicPath:"/artifacts/public",
        stats: { colors: true }
    });
    
server.listen(proxyPort, "localhost", function() {
    console.log(`Proxy server is running on port ${proxyPort}`);
});