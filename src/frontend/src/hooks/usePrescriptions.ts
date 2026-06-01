import { useState, useCallback } from 'react';
import { prescriptionApi } from '../services/api';

interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string;
  patientId: string;
  visitId?: string;
  prescriptionDate: string;
  diagnosis?: string;
  medications: Medication[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const usePrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await prescriptionApi.getAll();
      setPrescriptions(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch prescriptions';
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
      const response = await prescriptionApi.getByPatientId(patientId);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch prescriptions';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByVisitId = useCallback(async (visitId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await prescriptionApi.getByVisitId(visitId);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch prescriptions';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (prescriptionData: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>) => {
      setLoading(true);
      setError(null);
      try {
        const response = await prescriptionApi.create(prescriptionData);
        setPrescriptions((prev) => [...prev, response.data]);
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Failed to create prescription';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const update = useCallback(
    async (id: string, prescriptionData: Partial<Prescription>) => {
      setLoading(true);
      setError(null);
      try {
        const response = await prescriptionApi.update(id, prescriptionData);
        setPrescriptions((prev) =>
          prev.map((p) => (p.id === id ? response.data : p))
        );
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Failed to update prescription';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const delete_ = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await prescriptionApi.delete(id);
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete prescription';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    prescriptions,
    loading,
    error,
    fetchAll,
    fetchByPatientId,
    fetchByVisitId,
    create,
    update,
    delete: delete_,
  };
};
