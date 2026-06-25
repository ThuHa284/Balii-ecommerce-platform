import { getDistricts, getProvinces, getWards } from './api/locations.api';
import { Address } from '@/types/user.types';

const ADDRESS_META_PREFIX = '__BALII_ADDRESS__:';

type ParsedStoredAddress = {
  ward: string;
  street: string;
};

export function encodeStoredAddress(street: string, ward: string) {
  return `${ADDRESS_META_PREFIX}${JSON.stringify({ ward, street })}`;
}

export function parseStoredAddress(storedValue: string): ParsedStoredAddress {
  if (!storedValue.startsWith(ADDRESS_META_PREFIX)) {
    return {
      ward: '',
      street: storedValue,
    };
  }

  try {
    const payload = JSON.parse(
      storedValue.slice(ADDRESS_META_PREFIX.length),
    ) as Partial<ParsedStoredAddress>;

    return {
      ward: typeof payload.ward === 'string' ? payload.ward : '',
      street: typeof payload.street === 'string' ? payload.street : '',
    };
  } catch {
    return {
      ward: '',
      street: storedValue,
    };
  }
}

export function formatAddressLine(
  address: Pick<Address, 'street' | 'ward' | 'province'>,
) {
  return [address.street, address.ward, address.province]
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .join(', ');
}

export async function resolveFallbackLocationIds(provinceId: number) {
  const districts = await getDistricts(provinceId);
  const fallbackDistrict = districts[0];

  if (!fallbackDistrict) {
    throw new Error('Tỉnh/thành phố này chưa có dữ liệu địa giới khả dụng.');
  }

  const wards = await getWards(fallbackDistrict.id);
  const fallbackWard = wards[0];

  if (!fallbackWard) {
    throw new Error('Tỉnh/thành phố này chưa có phường/xã khả dụng trong hệ thống.');
  }

  return {
    districtId: fallbackDistrict.id,
    wardId: fallbackWard.id,
  };
}

export async function enrichAddressesWithLocationNames(
  addresses: Address[],
): Promise<Address[]> {
  if (!addresses.length) {
    return addresses;
  }

  const provinces = await getProvinces();
  const provinceMap = new Map(provinces.map((item) => [item.id, item.name]));

  const provinceIds = Array.from(
    new Set(addresses.map((item) => item.provinceId).filter(Boolean)),
  );
  const districtLists = await Promise.all(
    provinceIds.map((provinceId) => getDistricts(provinceId)),
  );
  const districtMap = new Map(
    districtLists.flat().map((item) => [item.id, item.name]),
  );

  const districtIds = Array.from(
    new Set(addresses.map((item) => item.districtId).filter(Boolean)),
  );
  const wardLists = await Promise.all(
    districtIds.map((districtId) => getWards(districtId)),
  );
  const wardMap = new Map(wardLists.flat().map((item) => [item.id, item.name]));

  return addresses.map((address) => {
    const parsed = parseStoredAddress(address.street);
    const manualWard = parsed.ward.trim();

    return {
      ...address,
      province: provinceMap.get(address.provinceId) ?? address.province,
      district: manualWard
        ? ''
        : (districtMap.get(address.districtId) ?? address.district),
      ward: manualWard || wardMap.get(address.wardId) || address.ward,
      street: parsed.street || address.street,
    };
  });
}

export async function enrichAddressWithLocationNames(address: Address) {
  const [enrichedAddress] = await enrichAddressesWithLocationNames([address]);
  return enrichedAddress;
}
