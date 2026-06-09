import { useState, useCallback } from 'react';
import { getToken } from '../utils/auth.js';

export interface PublicBooking {
  id?: string;
  patientName: string;
  phone: string;
  preferredDoctor?: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
  registerNumber?: string;
  appointmentType?: 'chamber' | 'admitted';
  preferredChamber?: string;
  hospitalName?: string;
  bedWardNumber?: string;
  admissionReason?: string;
  referringDoctor?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  submittedAt?: string;
}

export const usePublicBookings = () => {
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchAllBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/public-bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data = await response.json();
      setBookings(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const createBooking = useCallback(
    async (booking: PublicBooking) => {
      try {
        const response = await fetch(`${API_BASE}/api/public-bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking),
        });
        if (!response.ok) throw new Error('Failed to create booking');
        const created = await response.json();
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const updateBookingStatus = useCallback(
    async (id: string, status: 'confirmed' | 'cancelled') => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/public-bookings/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error('Failed to update booking');
        const updated = await response.json();
        setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  const deleteBooking = useCallback(
    async (id: string) => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE}/api/public-bookings/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to delete booking');
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      }
    },
    [API_BASE]
  );

  return {
    bookings,
    loading,
    error,
    fetchAllBookings,
    createBooking,
    updateBookingStatus,
    deleteBooking,
  };
};
