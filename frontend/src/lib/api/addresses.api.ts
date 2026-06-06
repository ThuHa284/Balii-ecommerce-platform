import apiClient from "./client";
import { mapAddress } from "./adapters";
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
  const { data } = await apiClient.get("/users/me/addresses");
  return (data as any[]).map(mapAddress);
}

export async function createAddress(payload: AddressPayload): Promise<Address> {
  const { data } = await apiClient.post("/users/me/addresses", payload);
  return mapAddress(data);
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressPayload>,
): Promise<Address> {
  const { data } = await apiClient.patch(`/users/me/addresses/${id}`, payload);
  return mapAddress(data);
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/users/me/addresses/${id}`);
}
