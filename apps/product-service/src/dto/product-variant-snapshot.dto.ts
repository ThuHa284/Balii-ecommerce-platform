export class ProductVariantSnapshotDto {
  variantId!: string;
  productId!: string;
  productName!: string;
  sku!: string;
  variantLabel!: string;
  thumbnailUrl?: string;
  unitPrice!: number;
  stockQuantity!: number;
  reservedQuantity!: number;
  isActive!: boolean;
}
