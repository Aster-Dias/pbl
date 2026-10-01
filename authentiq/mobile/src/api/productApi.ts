import { apiRequest } from './client';
import { ProductDetails } from '../types';

export const productApi = {
  async getProductDetails(productId: string): Promise<ProductDetails | null> {
    const res = await apiRequest<ProductDetails>(`/api/products/${productId}`);
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  },

  async createProduct(data: {
    productName: string;
    brand: string;
    category?: string;
    batchNumber: string;
    manufacturingDate: string;
    expiryDate: string;
  }): Promise<ProductDetails | null> {
    const res = await apiRequest<ProductDetails>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'Product creation failed');
  },

  async getManufacturerProducts(): Promise<ProductDetails[]> {
    const res = await apiRequest<{ content: ProductDetails[] }>('/api/products?size=50');
    if (res.success && res.data && res.data.content) {
      return res.data.content;
    }
    return [];
  },
};
