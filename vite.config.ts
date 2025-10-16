import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgrPlugin from '@arco-plugins/vite-plugin-svgr';
import vitePluginForArco from '@arco-plugins/vite-react';
import setting from './src/settings.json';


let env = loadEnv(process.env, process.cwd(), {
  development: '.env.development',
  production: '.env.production',
});

console.log('env', env)


export default defineConfig(
  {
    // base: '/bookmarks-local/', // 注意末尾 /
    resolve: {
      alias: [{ find: '@', replacement: '/src' }],
    },

    define: {
      ...loadEnv(process.env, process.cwd(), {
        development: '.env.development',
        production: '.env.production',
      }),
    },

    plugins: [
      react(),
      svgrPlugin({
        svgrOptions: {},
      }),
      vitePluginForArco({
        theme: '@arco-themes/react-arco-pro',
        modifyVars: {
          'arcoblue-6': setting.themeColor,
        },
      }),
    ],
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },


    /* server: {
      proxy: {
        //api是自行设置的请求前缀，任何请求路径以/api开头的请求将被代理到对应的target目标  与当前环境变量DEV的api前缀保持一致
        // [env.VITE_API_PREFIX]: {
        '/dev-api': {
          target: "http://localhost:8080", //目标域名
          changeOrigin: true, //需要代理跨域
          rewrite: (path) => path.replace(/^\/dev-api/, ''), //路径重写，把'/api'替换为''
        },
      // },
    }, */
  },
);
