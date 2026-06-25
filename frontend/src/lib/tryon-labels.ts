export function formatGenderLabel(value?: string | null) {
  if (!value) return 'Chưa có';

  const normalized = value.toLowerCase();
  if (normalized === 'female') return 'Nữ';
  if (normalized === 'male') return 'Nam';
  if (normalized === 'unisex') return 'Unisex';

  return value;
}

export function formatAgeGroupLabel(value?: string | null) {
  if (!value) return 'Chưa có';

  const normalized = value.toLowerCase();
  if (normalized === 'under_18') return 'Dưới 18 tuổi';
  if (normalized === '18_25') return '18 - 25 tuổi';
  if (normalized === '26_35') return '26 - 35 tuổi';
  if (normalized === '36_plus') return 'Từ 36 tuổi';

  return value;
}
