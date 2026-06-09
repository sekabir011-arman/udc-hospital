import { useState, useCallback } from 'react';
import { getToken } from '../utils/auth.js';

export interface ReceiptData {
  id?: string;
  receiptNumber?: string;
  patientId?: string;
  patientName: string;
  registerNumber?: string;
  amount: number;
  finalAmount?: number;
  discountRate?: number;
  paymentMethod?: 'cash' | 'bkash' | 'nagad' | 'card';
  invoiceState?: 'paid' | 'unpaid' | 'partial';
  paid?: boolean;
  notes?: string;
  receiptType?: 'appointment' | 'procedure' | 'investigation' | 'other';
  date?: string;
  createdAt?: string;
}

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchPatientReceipts = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/receipts/patient/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch receipts');
      const data = await response.json();
      setReceipts(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchAllReceipts = useCallback(
    async (from?: Date, to?: Date) => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const params = new URLSearchParams();
        if (from) params.append('from', from.toISOString());
        if (to) params.append('to', to.toISOString());

        const response = await fetch(`${API_BASE}/api/receipts?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch receipts');
        const data = await response.json();
        setReceipts(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [API_BASE]
  );

  const createReceipt = useCallback(
    async (data: ReceiptData) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/receipts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create receipt');
        const created = await response.json();
        setReceipts((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const updateReceipt = useCallback(
    async (id: string, updates: Partial<ReceiptData>) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/receipts/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error('Failed to update receipt');
        const updated = await response.json();
        setReceipts((prev) => prev.map((r) => (r.id === id ? updated : r)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const deleteReceipt = useCallback(
    async (id: string) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/receipts/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to delete receipt');
        setReceipts((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  return {
    receipts,
    loading,
    error,
    fetchPatientReceipts,
    fetchAllReceipts,
    createReceipt,
    updateReceipt,
    deleteReceipt,
  };
};
