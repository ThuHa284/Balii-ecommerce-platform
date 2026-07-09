import apiClient from "./client";
import { mapAddress } from "./adapters";
import {
  enrichAddressWithLocationNames,
  enrichAddressesWithLocationNames,
} from "@/lib/address-utils";
import { ApiResponse } from "@/types/api.types";
import { Address } from "@/types/user.types";

type AddressPayload = {
  recipientName: string;
  phone: string;
  provinceId: number;
  districtId: number;
  wardId: number;
  streetAddress: string;
  isDefault: boolean;
};

export async function getMyAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get<ApiResponse<unknown[]>>("/users/me/addresses");
  return enrichAddressesWithLocationNames(
    data.data.map((item) => mapAddress(item as Parameters<typeof mapAddress>[0])),
  );
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await apiClient.post("/users/me/addresses", payload);
  return enrichAddressWithLocationNames(mapAddress(data));
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressPayload>,
): Promise<Address> {
  const { data } = await apiClient.patch(`/users/me/addresses/${id}`, payload);
  return enrichAddressWithLocationNames(mapAddress(data));
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/users/me/addresses/${id}`);
}

export async function setDefaultAddress(id: string): Promise<Address> {
  const { data } = await apiClient.patch(`/users/me/addresses/${id}/default`);
  return enrichAddressWithLocationNames(mapAddress(data));
}
