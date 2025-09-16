import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storeAPI, footfallAPI, alertAPI } from '../services/api';

const RetailDataContext = createContext();

export const useRetailData = () => {
  const context = useContext(RetailDataContext);
  if (!context) {
    throw new Error('useRetailData must be used within a RetailDataProvider');
  }
  return context;
};

export const RetailDataProvider = ({ children }) => {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [footfallData, setFootfallData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [windowStats, setWindowStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Auto-refresh interval (5-10 seconds)
  const REFRESH_INTERVAL = 8000; // 8 seconds

  // Fetch stores
  const fetchStores = useCallback(async () => {
    try {
      const response = await storeAPI.getAll();
      if (response.data.success) {
        setStores(response.data.stores);
        return response.data.stores;
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError('Failed to fetch stores');
    }
    return [];
  }, []);

  // Fetch footfall data for selected store
  const fetchFootfallData = useCallback(async (storeId) => {
    if (!storeId) return null;
    
    try {
      const response = await footfallAPI.getCurrent(storeId);
      if (response.data.success) {
        setFootfallData(response.data.data);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error fetching footfall data:', error);
      setError('Failed to fetch footfall data');
    }
    return null;
  }, []);

  // Fetch window stats (last 1 hour)
  const fetchWindowStats = useCallback(async (storeId) => {
    if (!storeId) return null;
    
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const response = await footfallAPI.getByTimeRange(storeId, oneHourAgo, new Date());
      if (response.data.success) {
        const data = response.data.data;
        const stats = {
          entries: data.reduce((sum, item) => sum + item.entries, 0),
          exits: data.reduce((sum, item) => sum + item.exits, 0),
          peakOccupancy: Math.max(...data.map(item => item.currentOccupancy), 0),
          avgWaitTime: data.length > 0 ? data.reduce((sum, item) => sum + item.avgWaitTime, 0) / data.length : 0
        };
        setWindowStats(stats);
        return stats;
      }
    } catch (error) {
      console.error('Error fetching window stats:', error);
      setError('Failed to fetch window stats');
    }
    return null;
  }, []);

  // Fetch alerts for selected store
  const fetchAlerts = useCallback(async (storeId) => {
    if (!storeId) return [];
    
    try {
      const response = await alertAPI.getActive(storeId);
      if (response.data.success) {
        setAlerts(response.data.alerts);
        return response.data.alerts;
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setError('Failed to fetch alerts');
    }
    return [];
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (storeId, timeRange = '7d') => {
    if (!storeId) return null;
    
    try {
      const response = await footfallAPI.getAnalytics(storeId, timeRange);
      if (response.data.success) {
        setAnalytics(response.data.analytics);
        return response.data.analytics;
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics');
    }
    return null;
  }, []);

  // Initialize data load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setError(null);

      try {
        const storesList = await fetchStores();
        // Auto-select first store if none selected
        if (!selectedStore && storesList.length > 0) {
          setSelectedStore(storesList[0].storeId);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        setError('Failed to initialize data');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [fetchStores, selectedStore]);

  // Real-time data updates for selected store
  useEffect(() => {
    if (!selectedStore) return;

    const updateStoreData = async () => {
      try {
        await Promise.all([
          fetchFootfallData(selectedStore),
          fetchWindowStats(selectedStore),
          fetchAlerts(selectedStore)
        ]);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error updating store data:', error);
      }
    };

    // Initial load
    updateStoreData();

    // Set up auto-refresh
    const interval = setInterval(updateStoreData, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [selectedStore, fetchFootfallData, fetchWindowStats, fetchAlerts]);

  // Manually refresh all data
  const refreshData = useCallback(async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchStores(),
        fetchFootfallData(selectedStore),
        fetchWindowStats(selectedStore),
        fetchAlerts(selectedStore),
        fetchAnalytics(selectedStore)
      ]);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [selectedStore, fetchStores, fetchFootfallData, fetchWindowStats, fetchAlerts, fetchAnalytics]);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId) => {
    try {
      const response = await alertAPI.acknowledge(alertId);
      if (response.data.success) {
        setAlerts(prevAlerts => 
          prevAlerts.map(alert => 
            alert._id === alertId 
              ? { ...alert, acknowledged: true, acknowledgedAt: new Date() }
              : alert
          )
        );
        return true;
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      setError('Failed to acknowledge alert');
    }
    return false;
  }, []);

  // Update store configuration
  const updateStoreConfig = useCallback(async (storeId, config) => {
    try {
      const response = await storeAPI.update(storeId, config);
      if (response.data.success) {
        setStores(prevStores => 
          prevStores.map(store => 
            store.storeId === storeId 
              ? { ...store, ...config }
              : store
          )
        );
        return true;
      }
    } catch (error) {
      console.error('Error updating store config:', error);
      setError('Failed to update store configuration');
    }
    return false;
  }, []);

  // Generate staffing recommendation
  const getStaffingRecommendation = useCallback((currentOccupancy, maxCapacity, currentStaff) => {
    const occupancyRate = currentOccupancy / maxCapacity;
    let recommendation = {
      action: 'maintain',
      reason: 'Current staffing is adequate',
      suggestedStaff: currentStaff,
      priority: 'low'
    };

    if (occupancyRate > 0.8) {
      recommendation = {
        action: 'increase',
        reason: 'High occupancy detected - consider adding staff',
        suggestedStaff: Math.ceil(currentStaff * 1.3),
        priority: 'high'
      };
    } else if (occupancyRate > 0.6) {
      recommendation = {
        action: 'increase',
        reason: 'Moderate occupancy - slight staff increase recommended',
        suggestedStaff: currentStaff + 1,
        priority: 'medium'
      };
    } else if (occupancyRate < 0.3 && currentStaff > 1) {
      recommendation = {
        action: 'decrease',
        reason: 'Low occupancy - staff reduction possible',
        suggestedStaff: Math.max(1, currentStaff - 1),
        priority: 'low'
      };
    }

    return recommendation;
  }, []);

  const value = {
    // State
    stores,
    selectedStore,
    footfallData,
    alerts,
    windowStats,
    analytics,
    loading,
    error,
    lastUpdated,

    // Actions
    setSelectedStore,
    refreshData,
    acknowledgeAlert,
    updateStoreConfig,
    fetchAnalytics,
    getStaffingRecommendation,

    // Utilities
    REFRESH_INTERVAL
  };

  return (
    <RetailDataContext.Provider value={value}>
      {children}
    </RetailDataContext.Provider>
  );
};

export default RetailDataContext;