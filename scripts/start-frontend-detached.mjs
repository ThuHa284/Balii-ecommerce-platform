import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';

const stdout = openSync('E:\\HocODayNe\\DoAnTotNghiep\\LVTN\\Balii-ecommerce-platform\\.codex-frontend.out.log', 'a');
const stderr = openSync('E:\\HocODayNe\\DoAnTotNghiep\\LVTN\\Balii-ecommerce-platform\\.codex-frontend.err.log', 'a');

const child = spawn(
  'E:\\HocODayNe\\NodeJs\\node.exe',
  ['node_modules/next/dist/bin/next', 'dev', '-p', '3000'],
  {
    cwd: 'E:\\HocODayNe\\DoAnTotNghiep\\LVTN\\Balii-ecommerce-platform\\frontend',
    detached: true,
    stdio: ['ignore', stdout, stderr],
    windowsHide: true,
    env: {
      Path: 'E:\\HocODayNe\\NodeJs;C:\\Windows\\System32;C:\\Windows',
      SYSTEMROOT: 'C:\\Windows',
      TEMP: 'C:\\Users\\nguye\\AppData\\Local\\Temp',
      TMP: 'C:\\Users\\nguye\\AppData\\Local\\Temp',
      USERPROFILE: 'C:\\Users\\nguye',
      NODE_ENV: 'development',
    },
  },
);

child.unref();
console.log(child.pid);
