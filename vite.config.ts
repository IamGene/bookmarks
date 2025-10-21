import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgrPlugin from '@arco-plugins/vite-plugin-svgr';
import vitePluginForArco from '@arco-plugins/vite-react';
import setting from './src/settings.json';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  console.log('当前模式 mode:', mode);
  console.log('当前模式:', process.env);

  return {

    // base: mode === 'development' || process.env.VERCEL ? '/' : '/bookmarks/',
    // 本地构建github pages build,有/boookmarks路径

    base: '/',  // 开发模式/本地构建extension/vercel：无/boookmarks路径
    resolve: {
      alias: [{ find: '@', replacement: '/src' }],
    },

    define: {
      // ✅ 关键修复：序列化 env 变量
      ...Object.fromEntries(
        Object.entries(env).map(([key, val]) => [key, JSON.stringify(val)])
      ),
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
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // extensionHelper: path.resolve(__dirname, 'src/extension/extension-helper.html'),
          extensionHelper: path.resolve(__dirname, 'public/extension-helper.html'),
        },
      },
    },
    /*  server: {
       proxy: {
         //api是自行设置的请求前缀，任何请求路径以/api开头的请求将被代理到对应的target目标  与当前环境变量DEV的api前缀保持一致
         // [env.VITE_API_PREFIX]: {
         '/dev-api': {
           target: "http://localhost:8080", //目标域名
           changeOrigin: true, //需要代理跨域
           rewrite: (path) => path.replace(/^\/dev-api/, ''), //路径重写，把'/api'替换为''
         },
         // },
       }
     } */
  };
});
