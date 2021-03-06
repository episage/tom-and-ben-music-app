var path = require("path");
const fs = require("fs");

const chalk = require("chalk");

var webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const pkg = require(path.resolve(process.cwd(), "package.json"));
const dllPlugin = pkg.dllPlugin;

var webpackConfig = {
  entry: [
    isDevEnv() ? "react-hot-loader/patch" : null,
    isDevEnv() ? "webpack-hot-middleware/client?reload=false" : null,
    path.join(process.cwd(), "app/index.js") // Start with js/app.js
  ].filter(Boolean),
  output: {
    path: path.resolve(__dirname, "build"),
    // filename: 'bundle.js',
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    publicPath: "/"
  },
  plugins: [
    new webpack.ContextReplacementPlugin(
      /\.\/locale$/,
      "empty-module",
      false,
      /js$/
    ),
    // isDevEnv() ? function () {
    //   this.plugin('watch-run', function (watching, callback) {
    //     console.log('Begin compile at ' + new Date());
    //     callback();
    //   })
    // } : null,
    // new webpack.optimize.UglifyJsPlugin({
    //   compress: false,
    //   mangle: false,
    // }),
    isDevEnv() ? new webpack.HotModuleReplacementPlugin() : null, // Tell webpack we want hot reloading
    // isProdEnv() ? new UglifyJSPlugin() : null,
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }
    }),
    isDevEnv() ? new webpack.NamedModulesPlugin() : null,
    new HtmlWebpackPlugin({
      inject: true, // Inject all files that are generated by webpack, e.g. bundle.js
      templateContent: templateContent() // eslint-disable-line no-use-before-define
    })
  ].filter(Boolean),
  module: {
    exprContextCritical: false, // TODO: fixwith https://github.com/AngularClass/angular-starter/issues/993
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        include: /(app)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              "react",
              [
                "env",
                {
                  targets: { browsers: ["last 2 versions"] }
                }
              ]
            ].filter(Boolean),
            plugins: [
              "transform-decorators-legacy",
              "transform-object-rest-spread",
              "transform-class-properties",
              isDevEnv() ? "react-hot-loader/babel" : null
            ].filter(Boolean)
          }
        }
      },

      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              modules: true,
              importLoaders: 1,
              localIdentName: "[local]__[path][name]__[hash:base64:5]"
            }
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: true,
              sourceComments: true,
              plugins: loader => [
                require("postcss-import")({
                  root: path.resolve(__dirname),
                  path: "app/styles"
                }),
                require("postcss-cssnext")()
              ]
            }
          }
        ]
      },
      {
        test: /\.css$/,
        include: /node_modules/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              modules: true,
              importLoaders: 1,
              localIdentName: "[local]__[path][name]__[hash:base64:5]"
            }
          },
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: {
          loader: "file-loader"
        }
      },
      {
        test: /\.(jpg|png|gif)$/,
        use: {
          loader: "file-loader"
        }
      },
      {
        test: /\.html$/,
        use: {
          loader: "html-loader"
        }
      }
    ]
  },
  resolve: {
    modules: [path.resolve(__dirname, "app"), path.resolve(__dirname, "lib")]
      .concat(path.resolve(__dirname, "app", "components"))
      .concat(
        getFullLowerCaseDirectories(
          path.resolve(__dirname, "app", "components")
        )
      )
      .concat(path.resolve(__dirname, "app", "enhancers"))
      .concat(
        getFullLowerCaseDirectories(path.resolve(__dirname, "app", "enhancers"))
      )
      .concat(path.resolve(__dirname, "app", "models"))
      .concat(
        getFullLowerCaseDirectories(path.resolve(__dirname, "app", "models"))
      )
      .concat("node_modules"),
    alias: {
      "immutable-prop-types": "react-immutable-proptypes"
    },
    extensions: [".js"],
    mainFields: ["browser", "jsnext:main", "main"]
  },
  target: "web", // Make web variables accessible to webpack, e.g. window
  node: {
    // required by lib/timecamp-v3-javascript-client
    fs: "empty",
    net: "empty",
    tls: "empty",
    __dirname: true
  },
  devtool: isDevEnv() ? "cheap-module-eval-source-map" : undefined
};

console.log(
  chalk.dim(
    `
Webpack config:
${JSON.stringify(webpackConfig, null, 2)}
`
  )
);

module.exports = webpackConfig;

/**
 * We dynamically generate the HTML content in development so that the different
 * DLL Javascript files are loaded in script tags and available to our application.
 */
function templateContent() {
  const html = fs
    .readFileSync(path.resolve(process.cwd(), "app/index.html"))
    .toString();

  if (!dllPlugin) {
    return html;
  }

  const doc = cheerio(html);
  const body = doc.find("body");
  const dllNames = !dllPlugin.dlls
    ? ["reactBoilerplateDeps"]
    : Object.keys(dllPlugin.dlls);

  dllNames.forEach(dllName =>
    body.append(`<script data-dll='true' src='/${dllName}.dll.js'></script>`)
  );

  return doc.toString();
}

/* *** directory helpers *** */

function getFullLowerCaseDirectories(forPath) {
  return getLowerCaseDirectories(forPath).map(relativeDir =>
    path.resolve(forPath, relativeDir)
  );
}

function getLowerCaseDirectories(forPath) {
  return getDirectories(forPath).filter(wordIsLowercase);
}

function getDirectories(forPath) {
  console.log(__dirname);
  if (fs.existsSync(path)) {
    return fs
      .readdirSync(forPath)
      .filter(file => fs.lstatSync(path.join(forPath, file)).isDirectory());
  } else {
    return [];
  }
}

function wordIsLowercase(word) {
  return /[a-z]/.test(word[0]);
}

/* *** env helpers *** */

function isDevEnv() {
  return process.env.NODE_ENV !== "production";
}

function isProdEnv() {
  return process.env.NODE_ENV === "production";
}
