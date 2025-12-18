// 原生模块重建脚本（使用 node-gyp，直接指定 VS 路径）

const { execSync } = require('child_process');
const path = require('path');

const electronVersion = '39.2.6';
const arch = 'x64';
const disturl = 'https://electronjs.org/headers';
const runtime = 'electron';

const modules = [
  'better-sqlite3-multiple-ciphers'
];

console.log('开始重建原生模块...\n');

modules.forEach(moduleName => {
  const modulePath = path.join(process.cwd(), 'node_modules', moduleName);
  
  console.log(`重建 ${moduleName}...`);
  
  try {
    // 使用 node-gyp 直接重建
    const command = `node-gyp rebuild --target=${electronVersion} --arch=${arch} --disturl=${disturl} --runtime=${runtime} --msvs_version=18`;
    execSync(command, {
      cwd: modulePath,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_target: electronVersion,
        npm_config_arch: arch,
        npm_config_target_platform: 'win32',
        npm_config_disturl: disturl,
        npm_config_runtime: runtime,
        npm_config_msvs_version: '18',
        // 强制从源码编译
        npm_config_build_from_source: 'true',
      }
    });
    console.log(`✅ ${moduleName} 重建成功\n`);
  } catch (error) {
    console.error(`❌ ${moduleName} 重建失败`);
    process.exit(1);
  }
});

console.log('所有原生模块重建完成！');












