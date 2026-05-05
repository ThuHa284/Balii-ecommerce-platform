import { Product, Category } from "@/types/product.types";

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat_001", name: "Đồ ngủ lụa", slug: "do-ngu-lua", description: "Bộ sưu tập đồ ngủ lụa cao cấp", image: "https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=600", parentId: null, children: [], productCount: 12 },
  { id: "cat_002", name: "Pyjama", slug: "pyjama", description: "Pyjama lụa phong cách cổ điển", image: "https://images.unsplash.com/photo-1596783047517-aac4c3cc2a8b?w=600", parentId: null, children: [], productCount: 8 },
  { id: "cat_003", name: "Áo choàng", slug: "ao-choang", description: "Áo choàng lụa sang trọng", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600", parentId: null, children: [], productCount: 6 },
  { id: "cat_004", name: "Đầm ngủ", slug: "dam-ngu", description: "Đầm ngủ lụa quyến rũ", image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600", parentId: null, children: [], productCount: 10 },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod_001", name: "Bộ Đồ Ngủ Lụa Hồng Pastel", slug: "bo-do-ngu-lua-hong-pastel",
    description: "Bộ đồ ngủ lụa cao cấp màu hồng pastel, mềm mại và thoáng mát. Thiết kế thanh lịch, phù hợp cho giấc ngủ thư giãn.",
    shortDescription: "Lụa cao cấp, mềm mại thoáng mát", basePrice: 890000, salePrice: 690000,
    categoryId: "cat_001", category: MOCK_CATEGORIES[0],
    images: ["https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=800", "https://images.unsplash.com/photo-1596783047517-aac4c3cc2a8b?w=800"],
    thumbnail: "https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=400",
    variants: [
      { id: "var_001", productId: "prod_001", size: "S", color: "Hồng pastel", colorCode: "#F8BBD0", sku: "BDN-HP-S", price: 890000, salePrice: 690000, stock: 15, images: [] },
      { id: "var_002", productId: "prod_001", size: "M", color: "Hồng pastel", colorCode: "#F8BBD0", sku: "BDN-HP-M", price: 890000, salePrice: 690000, stock: 20, images: [] },
      { id: "var_003", productId: "prod_001", size: "L", color: "Hồng pastel", colorCode: "#F8BBD0", sku: "BDN-HP-L", price: 890000, salePrice: 690000, stock: 10, images: [] },
    ],
    reviews: [], averageRating: 4.8, totalReviews: 156, isFeatured: true, isNew: true, tags: ["lụa", "cao cấp", "hồng"],
    createdAt: "2024-01-15T00:00:00Z", updatedAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "prod_002", name: "Bộ Pyjama Lụa Trắng Ngà", slug: "bo-pyjama-lua-trang-nga",
    description: "Bộ pyjama lụa trắng ngà sang trọng, kiểu dáng cổ điển.", shortDescription: "Pyjama lụa trắng ngà sang trọng",
    basePrice: 950000, salePrice: null, categoryId: "cat_002", category: MOCK_CATEGORIES[1],
    images: ["https://images.unsplash.com/photo-1596783047517-aac4c3cc2a8b?w=800"],
    thumbnail: "https://images.unsplash.com/photo-1596783047517-aac4c3cc2a8b?w=400",
    variants: [
      { id: "var_004", productId: "prod_002", size: "S", color: "Trắng ngà", colorCode: "#FFF8E7", sku: "PJ-TN-S", price: 950000, salePrice: null, stock: 12, images: [] },
      { id: "var_005", productId: "prod_002", size: "M", color: "Trắng ngà", colorCode: "#FFF8E7", sku: "PJ-TN-M", price: 950000, salePrice: null, stock: 18, images: [] },
    ],
    reviews: [], averageRating: 4.6, totalReviews: 89, isFeatured: true, isNew: false, tags: ["pyjama", "trắng"],
    createdAt: "2024-02-01T00:00:00Z", updatedAt: "2024-03-12T00:00:00Z",
  },
  {
    id: "prod_003", name: "Áo Choàng Lụa Tím Lavender", slug: "ao-choang-lua-tim-lavender",
    description: "Áo choàng lụa tím lavender quyến rũ, dài ngang gối.", shortDescription: "Áo choàng lụa tím lavender",
    basePrice: 1200000, salePrice: 980000, categoryId: "cat_003", category: MOCK_CATEGORIES[2],
    images: ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800"],
    thumbnail: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400",
    variants: [
      { id: "var_007", productId: "prod_003", size: "M", color: "Tím lavender", colorCode: "#E1BEE7", sku: "AC-TL-M", price: 1200000, salePrice: 980000, stock: 7, images: [] },
      { id: "var_008", productId: "prod_003", size: "L", color: "Tím lavender", colorCode: "#E1BEE7", sku: "AC-TL-L", price: 1200000, salePrice: 980000, stock: 5, images: [] },
    ],
    reviews: [], averageRating: 4.9, totalReviews: 45, isFeatured: true, isNew: true, tags: ["áo choàng", "lavender"],
    createdAt: "2024-03-01T00:00:00Z", updatedAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "prod_004", name: "Đầm Ngủ Lụa Đen Quyến Rũ", slug: "dam-ngu-lua-den-quyen-ru",
    description: "Đầm ngủ lụa đen thiết kế hai dây tinh tế, viền ren chân váy.", shortDescription: "Đầm ngủ lụa đen viền ren",
    basePrice: 750000, salePrice: null, categoryId: "cat_004", category: MOCK_CATEGORIES[3],
    images: ["https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800"],
    thumbnail: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400",
    variants: [
      { id: "var_009", productId: "prod_004", size: "S", color: "Đen", colorCode: "#212121", sku: "DN-D-S", price: 750000, salePrice: null, stock: 20, images: [] },
      { id: "var_010", productId: "prod_004", size: "M", color: "Đen", colorCode: "#212121", sku: "DN-D-M", price: 750000, salePrice: null, stock: 15, images: [] },
    ],
    reviews: [], averageRating: 4.7, totalReviews: 67, isFeatured: false, isNew: false, tags: ["đầm ngủ", "đen"],
    createdAt: "2024-01-20T00:00:00Z", updatedAt: "2024-03-08T00:00:00Z",
  },
  {
    id: "prod_005", name: "Bộ Đồ Ngủ Lụa Xanh Mint", slug: "bo-do-ngu-lua-xanh-mint",
    description: "Bộ đồ ngủ lụa xanh mint tươi mát, thiết kế cổ chữ V thanh lịch.", shortDescription: "Đồ ngủ lụa xanh mint tươi mát",
    basePrice: 850000, salePrice: 720000, categoryId: "cat_001", category: MOCK_CATEGORIES[0],
    images: ["https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=800"],
    thumbnail: "https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=400",
    variants: [
      { id: "var_011", productId: "prod_005", size: "S", color: "Xanh mint", colorCode: "#B2DFDB", sku: "BDN-XM-S", price: 850000, salePrice: 720000, stock: 10, images: [] },
      { id: "var_012", productId: "prod_005", size: "M", color: "Xanh mint", colorCode: "#B2DFDB", sku: "BDN-XM-M", price: 850000, salePrice: 720000, stock: 14, images: [] },
    ],
    reviews: [], averageRating: 4.5, totalReviews: 34, isFeatured: false, isNew: true, tags: ["lụa", "xanh mint"],
    createdAt: "2024-03-05T00:00:00Z", updatedAt: "2024-03-16T00:00:00Z",
  },
  {
    id: "prod_006", name: "Bộ Pyjama Lụa Be Nude", slug: "bo-pyjama-lua-be-nude",
    description: "Bộ pyjama lụa be nude tinh tế, phong cách tối giản.", shortDescription: "Pyjama lụa be nude tối giản",
    basePrice: 920000, salePrice: null, categoryId: "cat_002", category: MOCK_CATEGORIES[1],
    images: ["https://images.unsplash.com/photo-1596783047517-aac4c3cc2a8b?w=800"],
    thumbnail: "https://images.unsplash.com/photo-1596783047517-aac4c3cc2a8b?w=400",
    variants: [
      { id: "var_014", productId: "prod_006", size: "M", color: "Be nude", colorCode: "#EFEBE9", sku: "PJ-BN-M", price: 920000, salePrice: null, stock: 9, images: [] },
      { id: "var_015", productId: "prod_006", size: "L", color: "Be nude", colorCode: "#EFEBE9", sku: "PJ-BN-L", price: 920000, salePrice: null, stock: 11, images: [] },
    ],
    reviews: [], averageRating: 4.4, totalReviews: 28, isFeatured: false, isNew: false, tags: ["pyjama", "be nude"],
    createdAt: "2024-02-10T00:00:00Z", updatedAt: "2024-03-14T00:00:00Z",
  },
];
