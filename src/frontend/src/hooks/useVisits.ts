import { useState, useCallback } from 'react';
import { visitApi } from '../services/api';

interface VitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
}

interface Visit {
  id: string;
  patientId: string;
  visitDate: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  vitalSigns: VitalSigns;
  physicalExamination?: string;
  diagnosis?: string;
  notes?: string;
  visitType: 'admitted' | 'outdoor';
  createdAt: string;
  updatedAt: string;
}

export const useVisits = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitApi.getAll();
      setVisits(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch visits';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByPatientId = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitApi.getByPatientId(patientId);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch visits';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (visitData: Omit<Visit, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitApi.create(visitData);
      setVisits((prev) => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create visit';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, visitData: Partial<Visit>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitApi.update(id, visitData);
      setVisits((prev) =>
        prev.map((v) => (v.id === id ? response.data : v))
      );
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update visit';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const delete_ = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await visitApi.delete(id);
      setVisits((prev) => prev.filter((v) => v.id !== id));
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete visit';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    visits,
    loading,
    error,
    fetchAll,
    fetchByPatientId,
    create,
    update,
    delete: delete_,
  };
};
