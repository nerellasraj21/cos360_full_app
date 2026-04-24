import CAxios from '@/api/index';
import type {
  FeeTransactionCreateRequest,
  FeeTransactionUpdateRequest,
  FeeTransactionSearchParams,
  FeeTransaction,
  FeeTransactionDetail,
  FeeOutstandingFees,
  FeeTransactionHistory
} from '@/types/fee/transaction';
import { useAcademicYearStore } from '@/lib/academicYearStore';

const BASE_URL = 'fee/transactions';

class FeeTransactionApi {
  static async healthCheck(): Promise<any> {
    console.log('FeeTransactionApi: Calling healthCheck');
    const response = await CAxios.get(`${BASE_URL}/health`);
    console.log('FeeTransactionApi: healthCheck response', response.data);
    return response.data;
  }

  static async createTransaction(data: FeeTransactionCreateRequest): Promise<FeeTransaction> {
    console.log('FeeTransactionApi: Creating transaction', data);
    try {
      const response = await CAxios.post(BASE_URL, data);
      console.log('FeeTransactionApi: Transaction created', response.data);
      return response.data;
    } catch (error) {
      console.error('FeeTransactionApi: Error creating transaction', error);
      throw error;
    }
  }

  static async getTransactionById(id: string): Promise<FeeTransactionDetail> {
    console.log('FeeTransactionApi: Getting transaction by id', id);
    const response = await CAxios.get(`${BASE_URL}/${id}`);
    console.log('FeeTransactionApi: Transaction detail', response.data);
    return response.data;
  }

  static async updateTransactionStatus(id: string, data: FeeTransactionUpdateRequest): Promise<FeeTransaction> {
    console.log('FeeTransactionApi: Updating transaction status', id, data);
    try {
      const response = await CAxios.put(`${BASE_URL}/${id}`, data);
      console.log('FeeTransactionApi: Transaction updated', response.data);
      return response.data;
    } catch (error) {
      console.error('FeeTransactionApi: Error updating transaction', error);
      throw error;
    }
  }

  static async searchTransactions(params?: FeeTransactionSearchParams): Promise<any> {
    console.log('FeeTransactionApi: Searching transactions', params);
    if (params && !params.academic_year_id) {
      params.academic_year_id = useAcademicYearStore.getState().selectedAcademicYearId;
    }
    const queryParams = new URLSearchParams();
    if (params?.student_id) queryParams.append('student_id', params.student_id);
    if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
    if (params?.payment_method) queryParams.append('payment_method', params.payment_method);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.has_receipt !== undefined) queryParams.append('has_receipt', String(params.has_receipt));
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const url = `${BASE_URL}${queryString ? `?${queryString}` : ''}`;
    const response = await CAxios.get(url);
    console.log('FeeTransactionApi: Search results', response.data);
    return response.data;
  }

  static async getOutstandingFees(studentId: string, academicYearId?: string): Promise<FeeOutstandingFees> {
    const yearId = academicYearId || useAcademicYearStore.getState().selectedAcademicYearId;
    console.log('FeeTransactionApi: Getting outstanding fees', studentId, yearId);
    const response = await CAxios.get(`${BASE_URL}/student/${studentId}/outstanding?academic_year_id=${yearId}`);
    console.log('FeeTransactionApi: Outstanding fees', response.data);
    return response.data;
  }

  static async getTransactionHistory(studentId: string, academicYearId?: string, limit?: number): Promise<FeeTransactionHistory> {
    const yearId = academicYearId || useAcademicYearStore.getState().selectedAcademicYearId;
    console.log('FeeTransactionApi: Getting transaction history', studentId, yearId, limit);
    const query = limit !== undefined ? `&limit=${limit}` : '';
    const response = await CAxios.get(`${BASE_URL}/student/${studentId}/history?academic_year_id=${yearId}${query}`);
    console.log('FeeTransactionApi: Transaction history', response.data);
    return response.data;
  }

  static async getTransactionByNumber(transactionNumber: string): Promise<FeeTransactionDetail> {
    console.log('FeeTransactionApi: Getting transaction by number', transactionNumber);
    const response = await CAxios.get(`${BASE_URL}/transaction-number/${transactionNumber}`);
    console.log('FeeTransactionApi: Transaction by number', response.data);
    return response.data;
  }

  static async getMyFeeTransactions(params?: { skip?: number; limit?: number }): Promise<any> {
    console.log('FeeTransactionApi: Getting my fee transactions', params);
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = `${BASE_URL}/my-fees${queryString ? `?${queryString}` : ''}`;
    const response = await CAxios.get(url);
    console.log('FeeTransactionApi: My fee transactions', response.data);
    return response.data;
  }

  static async getMyChildrenFeeTransactions(params?: { skip?: number; limit?: number; academic_year_id?: string; transaction_status?: string }): Promise<any> {
    console.log('FeeTransactionApi: Getting my children fee transactions', params);
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
    if (params?.transaction_status) queryParams.append('transaction_status', params.transaction_status);

    const queryString = queryParams.toString();
    const url = `${BASE_URL}/my-children-fees${queryString ? `?${queryString}` : ''}`;
    const response = await CAxios.get(url);
    console.log('FeeTransactionApi: My children fee transactions', response.data);
    return response.data;
  }

  static async getMyOutstandingFees(): Promise<any> {
    console.log('FeeTransactionApi: Getting my outstanding fees');
    const response = await CAxios.get(`${BASE_URL}/my-outstanding-fees`);
    console.log('FeeTransactionApi: My outstanding fees', response.data);
    return response.data;
  }

  static async getChildOutstandingFees(studentId: string): Promise<any> {
    console.log('FeeTransactionApi: Getting child outstanding fees', studentId);
    const response = await CAxios.get(`${BASE_URL}/child-outstanding-fees/${studentId}`);
    console.log('FeeTransactionApi: Child outstanding fees', response.data);
    return response.data;
  }
}

// Export the class as object
export const feeTransactionApi = FeeTransactionApi;

// Export individual functions
export const healthCheck = FeeTransactionApi.healthCheck;
export const createTransaction = FeeTransactionApi.createTransaction;
export const getTransactionById = FeeTransactionApi.getTransactionById;
export const updateTransactionStatus = FeeTransactionApi.updateTransactionStatus;
export const searchTransactions = FeeTransactionApi.searchTransactions;
export const getOutstandingFees = FeeTransactionApi.getOutstandingFees;
export const getTransactionHistory = FeeTransactionApi.getTransactionHistory;
export const getTransactionByNumber = FeeTransactionApi.getTransactionByNumber;
export const getMyFeeTransactions = FeeTransactionApi.getMyFeeTransactions;
export const getMyChildrenFeeTransactions = FeeTransactionApi.getMyChildrenFeeTransactions;
export const getMyOutstandingFees = FeeTransactionApi.getMyOutstandingFees;
export const getChildOutstandingFees = FeeTransactionApi.getChildOutstandingFees;