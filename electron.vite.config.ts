// 严格按照 V！.md v2025.PerfectScore.Final 生成
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@main': resolve('src/main') } },
    build: { 
      sourcemap: true, 
      target: 'node20',
      lib: { entry: 'src/main/index.ts' } 
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { 
      target: 'node20', 
      lib: { entry: 'src/preload/index.ts' } 
    }
  },
  renderer: {
    plugins: [vue()],
    resolve: { alias: { '@renderer': resolve('src/renderer/src') } },
    server: { watch: { ignored: ['**/*.log', '**/secrets.enc'] } },
    build: { sourcemap: true }
  }
});

