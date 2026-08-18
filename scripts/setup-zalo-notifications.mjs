import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { Zalo } from 'zca-js';

console.warn(
  'CẢNH BÁO: zca-js là API Zalo không chính thức. Hãy dùng tài khoản riêng vì tài khoản có thể bị khóa.',
);

const zalo = new Zalo();
const api = await zalo.loginQR({ qrPath: 'zca-qr.png' });
const context = api.getContext();
const cookieJson = JSON.stringify(api.getCookie().toJSON().cookies);
const cookieBase64 = Buffer.from(cookieJson, 'utf8').toString('base64');
const groups = await api.getAllGroups();
const groupIds = Object.keys(groups.gridVerMap);

if (groupIds.length === 0) {
  throw new Error('Tài khoản Zalo chưa tham gia nhóm nào.');
}

const details = await api.getGroupInfo(groupIds);
const availableGroups = groupIds
  .map((groupId) => ({
    id: groupId,
    name: details.gridInfoMap[groupId]?.name || 'Nhóm không rõ tên',
  }))
  .sort((left, right) => left.name.localeCompare(right.name, 'vi'));

console.log('\nCác nhóm Zalo có thể nhận thông báo:');
availableGroups.forEach((group, index) => {
  console.log(`${index + 1}. ${group.name} (${group.id})`);
});

const readline = createInterface({ input, output });
const answer = await readline.question('\nNhập số thứ tự nhóm cần dùng: ');
readline.close();

const selected = availableGroups[Number(answer) - 1];
if (!selected) throw new Error('Số thứ tự nhóm không hợp lệ.');

const envContents = [
  'ZALO_NOTIFICATION_ENABLED=true',
  `ZALO_IMEI=${context.imei}`,
  `ZALO_USER_AGENT=${context.userAgent}`,
  `ZALO_COOKIE_BASE64=${cookieBase64}`,
  `ZALO_GROUP_ID=${selected.id}`,
  'ZALO_NOTIFICATION_TIMEOUT_MS=10000',
  '',
].join('\n');

await writeFile('.env.zalo.generated', envContents, {
  encoding: 'utf8',
  mode: 0o600,
});

console.log(
  `\nĐã tạo .env.zalo.generated cho nhóm "${selected.name}". Sao chép các biến này vào root/.env hoặc secret production rồi xóa file sau khi dùng.`,
);
