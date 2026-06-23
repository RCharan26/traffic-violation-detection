import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const ViolationContext = createContext(null);

export function ViolationProvider({ children }) {
  const [user, setUser] = useState(() => api.getCurrentUser());
  const [token, setToken] = useState(() => localStorage.getItem('tvai_token'));
  
  // Violations log state
  const [violations, setViolations] = useState([]);
  const [totalViolations, setTotalViolations] = useState(0);
  
  // Images history log state
  const [history, setHistory] = useState([]);
  const [totalHistory, setTotalHistory] = useState(0);
  
  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync token checks
  useEffect(() => {
    const activeToken = localStorage.getItem('tvai_token');
    const activeUser = api.getCurrentUser();
    if (activeToken && activeUser) {
      setToken(activeToken);
      setUser(activeUser);
    } else {
      setToken(null);
      setUser(null);
    }
  }, []);

  const actions = {
    // ── Authentication ────────────────────────────────────────
    async login(username, password) {
      setLoading(true);
      setError(null);
      try {
        const loggedUser = await api.login(username, password);
        setUser(loggedUser);
        setToken(localStorage.getItem('tvai_token'));
        setLoading(false);
        return loggedUser;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    logout() {
      api.logout();
      setUser(null);
      setToken(null);
    },

    // ── Violations Log (Real-time DB query) ───────────────────
    async fetchViolations(params = {}) {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getViolations(params);
        setViolations(data.items || []);
        setTotalViolations(data.total || 0);
        setLoading(false);
        return data;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    async updateViolationStatus(violationId, status) {
      setLoading(true);
      setError(null);
      try {
        const updated = await api.updateViolationStatus(violationId, status);
        setViolations(prev =>
          prev.map(v => (v.id === violationId ? { ...v, status: updated.status } : v))
        );
        setLoading(false);
        return updated;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    async deleteViolation(violationId) {
      setLoading(true);
      setError(null);
      try {
        await api.deleteViolation(violationId);
        setViolations(prev => prev.filter(v => v.id !== violationId));
        setTotalViolations(prev => Math.max(0, prev - 1));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    // ── Direct Database Analytics Aggregation ──────────────────
    async fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getAnalytics();
        setAnalytics(data);
        setLoading(false);
        return data;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    // ── Images Processing Log (History) ───────────────────────
    async fetchHistory(params = {}) {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getHistory(params);
        setHistory(data.items || []);
        setTotalHistory(data.total || 0);
        setLoading(false);
        return data;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    async deleteHistoryRecord(imageId) {
      setLoading(true);
      setError(null);
      try {
        await api.deleteHistoryRecord(imageId);
        setHistory(prev => prev.filter(img => img.id !== imageId));
        setTotalHistory(prev => Math.max(0, prev - 1));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },

    // ── Image Processing Pipeline ─────────────────────────────
    async uploadAndProcess(file, locationLabel = '') {
      setLoading(true);
      setError(null);
      try {
        // Step 1: Upload image file
        const uploadResult = await api.uploadImage(file, locationLabel);
        
        // Step 2: Trigger computer vision models (YOLO & OCR)
        const pipelineResult = await api.runDetection(uploadResult.id);
        
        setLoading(false);
        return pipelineResult;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    },
  };

  const state = {
    user,
    token,
    violations,
    totalViolations,
    history,
    totalHistory,
    analytics,
    loading,
    error,
  };

  return (
    <ViolationContext.Provider value={{ state, actions }}>
      {children}
    </ViolationContext.Provider>
  );
}

export function useViolations() {
  const context = useContext(ViolationContext);
  if (!context) throw new Error('useViolations must be used within ViolationProvider');
  return context;
}
