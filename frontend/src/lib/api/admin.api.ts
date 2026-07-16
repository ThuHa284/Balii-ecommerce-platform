import apiClient from './client';
import { mapOrder } from './adapters';
import { AdminReturnRequest, Order, ReturnRequest } from '@/types/order.types';
import { User, UserRole } from '@/types/user.types';
import { mapUser } from './adapters';

export interface AdminRevenuePoint {
  month: string;
  revenue: number;
}

export interface AdminRecentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface AdminTopProduct {
  productId: string;
  productName: string;
  thumbnail: string;
  quantitySold: number;
  revenue: number;
  campaignQuantitySold: number;
  campaignRevenue: number;
  campaignOrderCount: number;
}

export interface AdminOrderStatusPoint {
  status: string;
  count: number;
}

export interface AdminOrder extends Order {
  customerName: string;
  customerEmail: string | null;
}

export interface AdminUser extends User {
  orderCount: number | null;
  totalSpent: number | null;
}

export interface AdminRefund {
  id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  paymentAmount: number;
  refundAmount: number;
  paymentStatus: string;
  refundStatus: string;
  provider: string;
  providerRefundId: string | null;
  reason: string | null;
  failureReason: string | null;
  createdAt: string;
  refundedAt: string | null;
  gatewayStatus: string | null;
  workflowResolution: string | null;
  retryCount: number;
}

export interface AdminWorkflowVariable {
  type: string;
  value: unknown;
}

export interface AdminWorkflowStep {
  activityId: string;
  activityName: string;
  activityType: string;
}

export interface AdminWorkflowActivity extends AdminWorkflowStep {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface AdminWorkflowIncident {
  id: string;
  activityId: string | null;
  incidentType: string | null;
  message: string | null;
  createdAt: string | null;
}

export interface AdminWorkflowSnapshot {
  kind: 'payment' | 'refund';
  processDefinitionKey: string;
  businessKey: string;
  state:
    | 'NOT_FOUND'
    | 'UNAVAILABLE'
    | 'ACTIVE'
    | 'COMPLETED'
    | 'INCIDENT'
    | 'UNKNOWN';
  processInstanceId: string | null;
  processDefinitionId: string | null;
  bpmnXml: string | null;
  startedAt: string | null;
  endedAt: string | null;
  currentSteps: AdminWorkflowStep[];
  activities: AdminWorkflowActivity[];
  incidents: AdminWorkflowIncident[];
  variables: Record<string, AdminWorkflowVariable>;
  highlightedVariables: Record<string, AdminWorkflowVariable>;
  camundaReachable: boolean;
  error: string | null;
}

export interface AdminRefundWorkflowItem {
  refund: {
    id: string;
    paymentId: string;
    orderId: string;
    amount: number;
    refundStatus: string;
    providerRefundId: string | null;
    workflowResolution: string | null;
    createdAt: string;
    refundedAt: string | null;
  };
  workflow: AdminWorkflowSnapshot;
}

export interface AdminWorkflowMonitorResponse {
  search: {
    orderId: string;
    paymentId: string;
  };
  payment: {
    id: string;
    orderId: string;
    userId: string;
    amount: number;
    provider: string;
    status: string;
    providerRef: string | null;
    providerTransactionId: string | null;
    createdAt: string;
    paidAt: string | null;
  };
  paymentWorkflow: AdminWorkflowSnapshot;
  refundWorkflows: AdminRefundWorkflowItem[];
}

export interface AdminWorkflowContext {
  paymentId: string;
  orderId: string;
  orderCode: string | null;
  customerName: string | null;
  amount: number;
  provider: string;
  status: string;
  createdAt: string;
}

export interface AdminWorkflowOverviewActivity {
  activityId: string;
  activeInstances: number;
  incidents: number;
}

export interface AdminWorkflowOverviewDefinition {
  processDefinitionKey: string;
  processDefinitionId: string;
  processName: string;
  version: number;
  versions: number;
  bpmnXml: string;
  totals: {
    all: number;
    active: number;
    completed: number;
    incidents: number;
  };
  activities: AdminWorkflowOverviewActivity[];
}

export interface AdminWorkflowOverviewResponse {
  definitions: AdminWorkflowOverviewDefinition[];
  generatedAt: string;
}

export interface AdminKafkaTopic {
  name: string;
  partitions: number;
  replicationFactor: number;
  messageCount: number;
}

export interface AdminKafkaConsumerGroup {
  groupId: string;
  protocolType: string;
}

export interface AdminKafkaEventCatalogItem {
  topic: string;
  label: string;
  description: string;
  producer: string;
  intendedConsumers: string[];
}

export interface AdminKafkaOutboxEvent {
  id: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  status: string;
  retryCount: number;
  createdAt: string;
  publishedAt: string | null;
  lastError: string | null;
}

export interface AdminKafkaOverviewResponse {
  connected: boolean;
  brokers: string[];
  kafkaUiUrl: string;
  topics: AdminKafkaTopic[];
  consumerGroups: AdminKafkaConsumerGroup[];
  outbox: {
    counts: Record<string, number>;
    recentEvents: AdminKafkaOutboxEvent[];
  };
  eventCatalog: AdminKafkaEventCatalogItem[];
  error: string | null;
}

export interface AdminMarketImageSearchItem {
  title: string;
  price: number | null;
  currency: string | null;
  shopName: string | null;
  source: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  confidenceScore: number | null;
  rawData: Record<string, unknown>;
  isSaved: boolean;
  savedProductId?: string;
  unsavedReason?: string;
}

export interface AdminMarketImageSearchResponse {
  items: AdminMarketImageSearchItem[];
  savedCount: number;
  skippedCount: number;
}

type BackendMarketSearchItem = {
  title: string;
  source?: string | null;
  link: string | null;
  imageUrl?: string | null;
  price?: string | null;
  extractedPrice?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviews?: number | null;
  snippet?: string | null;
  engine: 'google_lens' | 'google_shopping' | 'google_images';
  confidenceScore: number;
  isSaved?: boolean;
  rawData?: Record<string, unknown>;
};

type BackendMarketSearchResponse = {
  success: boolean;
  keyword: string;
  imageUrl?: string;
  total: number;
  results?: BackendMarketSearchItem[];
  items?: BackendMarketSearchItem[];
  savedCount?: number;
  skippedCount?: number;
};

export interface AdminDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  revenueByMonth: AdminRevenuePoint[];
  recentOrders: AdminRecentOrder[];
}

export interface AdminAnalyticsStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  monthlyRevenue: AdminRevenuePoint[];
  topProducts: AdminTopProduct[];
  orderStatusBreakdown: AdminOrderStatusPoint[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { data } = await apiClient.get<AdminDashboardStats>(
    '/orders/admin/dashboard',
  );
  return {
    totalRevenue: data?.totalRevenue ?? 0,
    totalOrders: data?.totalOrders ?? 0,
    totalCustomers: data?.totalCustomers ?? 0,
    totalProducts: data?.totalProducts ?? 0,
    revenueGrowth: data?.revenueGrowth ?? 0,
    orderGrowth: data?.orderGrowth ?? 0,
    revenueByMonth: Array.isArray(data?.revenueByMonth)
      ? data.revenueByMonth
      : [],
    recentOrders: Array.isArray(data?.recentOrders) ? data.recentOrders : [],
  };
}

export async function getAdminAnalyticsStats(): Promise<AdminAnalyticsStats> {
  const { data } = await apiClient.get<AdminAnalyticsStats>(
    '/orders/admin/analytics',
  );
  return {
    totalRevenue: data?.totalRevenue ?? 0,
    totalOrders: data?.totalOrders ?? 0,
    totalCustomers: data?.totalCustomers ?? 0,
    totalProducts: data?.totalProducts ?? 0,
    averageOrderValue: data?.averageOrderValue ?? 0,
    revenueGrowth: data?.revenueGrowth ?? 0,
    orderGrowth: data?.orderGrowth ?? 0,
    monthlyRevenue: Array.isArray(data?.monthlyRevenue)
      ? data.monthlyRevenue
      : [],
    topProducts: Array.isArray(data?.topProducts) ? data.topProducts : [],
    orderStatusBreakdown: Array.isArray(data?.orderStatusBreakdown)
      ? data.orderStatusBreakdown
      : [],
  };
}

type BackendAdminOrder = Parameters<typeof mapOrder>[0] & {
  customerName: string;
  customerEmail?: string | null;
};

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const { data } = await apiClient.get<BackendAdminOrder[]>(
    '/orders/admin/orders',
  );
  return data.map((item) => ({
    ...mapOrder(item),
    customerName: item.customerName,
    customerEmail: item.customerEmail ?? null,
  }));
}

export async function updateAdminOrderStatus(
  orderId: string,
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipping'
    | 'delivered'
    | 'cancelled',
  note?: string,
): Promise<AdminOrder> {
  const { data } = await apiClient.patch<BackendAdminOrder>(
    `/orders/admin/orders/${orderId}/status`,
    { status, note },
  );

  return {
    ...mapOrder(data),
    customerName: data.customerName,
    customerEmail: data.customerEmail ?? null,
  };
}

export async function getAdminOrderReturnRequests(
  orderId: string,
): Promise<ReturnRequest[]> {
  const { data } = await apiClient.get<ReturnRequest[]>(
    `/orders/admin/orders/${orderId}/return-requests`,
  );
  return data;
}

export async function getAdminReturnRequests(
  status?: ReturnRequest['status'],
): Promise<AdminReturnRequest[]> {
  const { data } = await apiClient.get<AdminReturnRequest[]>(
    '/orders/admin/return-requests',
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function reviewAdminReturnRequest(
  returnRequestId: string,
  payload: {
    status: 'approved' | 'rejected';
    adminNote?: string;
  },
): Promise<ReturnRequest> {
  const { data } = await apiClient.patch<ReturnRequest>(
    `/orders/admin/return-requests/${returnRequestId}`,
    payload,
  );
  return data;
}

type BackendAdminUser = Parameters<typeof mapUser>[0];

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<BackendAdminUser[]>('/users');
  return data.map((item) => ({
    ...mapUser(item, []),
    orderCount: null,
    totalSpent: null,
  }));
}

export async function updateAdminUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<BackendAdminUser>(
    `/users/${userId}/role`,
    { role },
  );

  return {
    ...mapUser(data, []),
    orderCount: null,
    totalSpent: null,
  };
}

export async function getAdminRefunds(): Promise<AdminRefund[]> {
  const { data } = await apiClient.get<AdminRefund[]>(
    '/payments/admin/refunds',
  );
  return data;
}

export async function getAdminWorkflowMonitor(params: {
  orderId?: string;
  paymentId?: string;
}): Promise<AdminWorkflowMonitorResponse> {
  const { data } = await apiClient.get<AdminWorkflowMonitorResponse>(
    '/payments/admin/workflows',
    {
      params,
    },
  );
  return data;
}

export async function getAdminWorkflowOverview(): Promise<AdminWorkflowOverviewResponse> {
  const { data } = await apiClient.get<AdminWorkflowOverviewResponse>(
    '/payments/admin/workflow-overview',
  );
  return data;
}

export async function getAdminKafkaOverview(): Promise<AdminKafkaOverviewResponse> {
  const { data } = await apiClient.get<AdminKafkaOverviewResponse>(
    '/payments/admin/kafka-overview',
  );
  return data;
}

export async function getAdminWorkflowContexts(
  limit = 20,
): Promise<AdminWorkflowContext[]> {
  const { data } = await apiClient.get<AdminWorkflowContext[]>(
    '/payments/admin/workflow-contexts',
    { params: { limit } },
  );
  return data;
}

export async function searchAdminMarketByImage(payload: {
  image?: File | null;
  imageUrl?: string;
  keyword?: string;
  limit?: number;
}): Promise<AdminMarketImageSearchResponse> {
  const formData = new FormData();

  if (payload.image) {
    formData.append('image', payload.image);
  }

  if (payload.imageUrl) {
    formData.append('imageUrl', payload.imageUrl);
  }

  if (payload.keyword) {
    formData.append('keyword', payload.keyword);
  }

  formData.append('limit', String(payload.limit ?? 10));

  const { data } = await apiClient.post<BackendMarketSearchResponse>(
    '/admin/market-analysis/search-by-image',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  const rawItems = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data.items)
      ? data.items
      : [];

  const items = rawItems.map<AdminMarketImageSearchItem>((item) => ({
    title: item.title,
    price: item.extractedPrice ?? null,
    currency: item.currency ?? null,
    shopName: item.source ?? null,
    source: item.source ?? null,
    imageUrl: item.imageUrl ?? null,
    productUrl: item.link ?? null,
    confidenceScore: item.confidenceScore ?? null,
    rawData: item.rawData ?? {},
    isSaved: item.isSaved ?? false,
  }));

  return {
    items,
    savedCount:
      typeof data.savedCount === 'number'
        ? data.savedCount
        : items.filter((item) => item.isSaved).length,
    skippedCount:
      typeof data.skippedCount === 'number'
        ? data.skippedCount
        : items.filter((item) => !item.isSaved).length,
  };
}
