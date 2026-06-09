import { useState, useCallback, useEffect } from 'react';
import { getToken } from '../utils/auth.js';

interface SerialQueueEntry {
  id: string;
  patientId?: string;
  patientName: string;
  phone?: string;
  serialNumber: number;
  status: 'waiting' | 'in-progress' | 'done';
  arrivalTime?: string;
  queueDate?: string;
  addedAt: string;
  calledAt?: string;
}

export const useSerialQueue = () => {
  const [entries, setEntries] = useState<SerialQueueEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchTodayQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/serial-queue/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const fetchByDate = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/serial-queue/date/${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      setEntries(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const addEntry = useCallback(
    async (entry: Omit<SerialQueueEntry, 'id' | 'addedAt'>) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/serial-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error('Failed to create entry');
        const newEntry = await response.json();
        setEntries((prev) => [...prev, newEntry]);
        return newEntry;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const updateStatus = useCallback(
    async (id: string, status: string, calledAt?: string) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/serial-queue/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, calledAt }),
        });
        if (!response.ok) throw new Error('Failed to update entry');
        const updated = await response.json();
        setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/serial-queue/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to delete entry');
        setEntries((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const resetQueue = useCallback(
    async (date: string) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/serial-queue/date/${date}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to reset queue');
        setEntries([]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  return {
    entries,
    loading,
    error,
    fetchTodayQueue,
    fetchByDate,
    addEntry,
    updateStatus,
    deleteEntry,
    resetQueue,
  };
};
