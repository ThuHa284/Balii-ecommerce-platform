const fs = require('fs');
const path = require('path');
const axios = require('axios');

function parseEnvFile(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    values[key] = value;
  }

  return values;
}

function loadLocalEnv(envFileArg) {
  const envFile = envFileArg || process.env.APP_ENV_FILE || '.env';
  const envPath = path.resolve(process.cwd(), envFile);

  if (!fs.existsSync(envPath)) {
    return;
  }

  const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));

  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const result = {
    envFile: null,
    apiKeyEnv: null,
    onlyImage: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--env-file') {
      result.envFile = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (arg === '--api-key-env') {
      result.apiKeyEnv = argv[i + 1] || null;
      i += 1;
      continue;
    }

    if (arg === '--image-only') {
      result.onlyImage = true;
    }
  }

  return result;
}

async function listModels(apiKey) {
  const models = [];
  let pageToken = null;

  do {
    const response = await axios.get(
      'https://generativelanguage.googleapis.com/v1beta/models',
      {
        params: {
          key: apiKey,
          pageToken: pageToken || undefined,
        },
        timeout: 30000,
      },
    );

    const payload = response.data || {};
    models.push(...(payload.models || []));
    pageToken = payload.nextPageToken || null;
  } while (pageToken);

  return models;
}

function pickApiKey(explicitEnvName) {
  const envCandidates = explicitEnvName
    ? [explicitEnvName]
    : [
        'TRYON_GEMINI_API_KEY',
        'GEMINI_API_KEY',
        'CHATBOT_GEMINI_API_KEY',
      ];

  for (const keyName of envCandidates) {
    const value = process.env[keyName];
    if (value) {
      return { keyName, value };
    }
  }

  return null;
}

function formatMethods(methods) {
  return Array.isArray(methods) && methods.length > 0
    ? methods.join(', ')
    : '(không rõ)';
}

function isImageModel(model) {
  const haystack = `${model.name || ''} ${model.displayName || ''} ${model.description || ''}`.toLowerCase();
  return haystack.includes('image') || haystack.includes('imagen');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadLocalEnv(args.envFile);

  const apiKeyInfo = pickApiKey(args.apiKeyEnv);

  if (!apiKeyInfo) {
    console.error(
      'Không tìm thấy API key. Hãy đặt TRYON_GEMINI_API_KEY, GEMINI_API_KEY hoặc truyền --api-key-env TEN_BIEN.',
    );
    process.exit(1);
  }

  console.log(`Đang dùng API key từ biến: ${apiKeyInfo.keyName}`);

  try {
    const models = await listModels(apiKeyInfo.value);
    const sorted = [...models].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || '')),
    );
    const visibleModels = args.onlyImage
      ? sorted.filter(isImageModel)
      : sorted;

    const generateContentModels = visibleModels.filter((model) =>
      (model.supportedGenerationMethods || []).includes('generateContent'),
    );

    const interactionModels = visibleModels.filter((model) =>
      (model.supportedGenerationMethods || []).includes('createCachedContent'),
    );

    console.log(`Tổng model nhìn thấy bởi key này: ${sorted.length}`);
    console.log(
      `Model sau khi lọc${args.onlyImage ? ' ảnh' : ''}: ${visibleModels.length}`,
    );
    console.log(
      `Model hỗ trợ generateContent${args.onlyImage ? ' trong nhóm ảnh' : ''}: ${generateContentModels.length}`,
    );

    if (visibleModels.length === 0) {
      console.log('Không có model nào khớp bộ lọc hiện tại.');
      return;
    }

    console.log('\nDanh sách model:');
    for (const model of visibleModels) {
      console.log(`- ${model.name}`);
      if (model.displayName) {
        console.log(`  displayName: ${model.displayName}`);
      }
      console.log(`  methods: ${formatMethods(model.supportedGenerationMethods)}`);
      if (model.description) {
        console.log(`  description: ${model.description}`);
      }
    }

    if (args.onlyImage) {
      console.log('\nGợi ý:');
      console.log(
        '- Nếu model bạn muốn không xuất hiện ở đây, API key hiện tại không được cấp cho model đó hoặc model đó đã đổi tên.',
      );
      console.log(
        '- Với service hiện tại đang gọi generateContent, hãy ưu tiên model có methods chứa generateContent.',
      );
    } else {
      console.log('\nMẹo: thêm --image-only để chỉ xem model ảnh.');
    }

    if (interactionModels.length > 0) {
      console.log(
        '\nLưu ý: một số model mới thiên về Interactions API. Repo của bạn hiện đang dùng generateContent trong @google/generative-ai cũ.',
      );
    }
  } catch (error) {
    const status = error.response?.status;
    const data = error.response?.data;

    console.error(`Gọi ListModels thất bại${status ? ` (${status})` : ''}.`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    } else {
      console.error(error.message || String(error));
    }
    process.exit(1);
  }
}

void main();
