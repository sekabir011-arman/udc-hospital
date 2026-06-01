import { useState, useCallback } from 'react';
import { patientApi } from '../services/api';

interface Patient {
  id: string;
  fullName: string;
  nameBn?: string;
  dateOfBirth?: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  weight?: number;
  height?: number;
  allergies: string[];
  chronicConditions: string[];
  pastSurgicalHistory?: string;
  patientType: 'admitted' | 'outdoor';
  consultantEmail?: string;
  consultantName?: string;
  createdAt: string;
  updatedAt: string;
}

export const usePatients = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getAll();
      setPatients(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch patients';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getById(id);
      setCurrentPatient(response.data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch patient';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.create(patientData);
      setPatients((prev) => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create patient';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (id: string, patientData: Partial<Patient>) => {
      setLoading(true);
      setError(null);
      try {
        const response = await patientApi.update(id, patientData);
        setPatients((prev) =>
          prev.map((p) => (p.id === id ? response.data : p))
        );
        if (currentPatient?.id === id) {
          setCurrentPatient(response.data);
        }
        return response.data;
      } catch (err: any) {
        const message = err.response?.data?.error || 'Failed to update patient';
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [currentPatient]
  );

  const delete_ = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await patientApi.delete(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      if (currentPatient?.id === id) {
        setCurrentPatient(null);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete patient';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [currentPatient]);

  const syncSince = useCallback(async (timestamp: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getSince(timestamp);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to sync patients';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    patients,
    currentPatient,
    loading,
    error,
    fetchAll,
    fetchById,
    create,
    update,
    delete: delete_,
    syncSince,
  };
};
