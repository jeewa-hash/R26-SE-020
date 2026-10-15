import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredProviderAuth, subscribeProviderSession } from '../pages/IT22129376/services/providerAuthStorage';
import { JOB_STATUS } from '../constants/jobStatus';

const AppliedJobsContext = createContext();

export function AppliedJobsProvider({ children }) {
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [availablePosts, setAvailablePosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const providerRef = useRef(null);
  const loadVersion = useRef(0);

  // Reload provider-owned data whenever the signed-in account changes.
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeProviderSession((providerId) => {
      if (active) loadData(providerId);
    });
    const version = loadVersion.current;
    getStoredProviderAuth().then((auth) => {
      if (active && version === loadVersion.current) loadData(auth.isLoggedIn ? auth.providerId : null);
    });
    return () => { active = false; loadVersion.current += 1; unsubscribe(); };
  }, []);

  const loadData = async (providerId) => {
    const version = ++loadVersion.current;
    providerRef.current = providerId;
    setAppliedJobs([]);
    setAvailablePosts([]);
    setLoading(true);
    try {
      if (!providerId) return;
      const [storedApplied, storedAvailable] = await Promise.all([
        AsyncStorage.getItem(`appliedJobs:${providerId}`),
        AsyncStorage.getItem(`availablePosts:${providerId}`),
      ]);
      if (version !== loadVersion.current) return;
      const savedApplications = storedApplied ? JSON.parse(storedApplied) : [];
      setAppliedJobs(Array.isArray(savedApplications)
        ? savedApplications.filter((job) => !['1', '2', '3', '4', '5'].includes(String(job.id))) : []);
      const savedPosts = storedAvailable ? JSON.parse(storedAvailable) : [];
      setAvailablePosts(Array.isArray(savedPosts) ? savedPosts : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  const saveAppliedJobs = async (jobs) => {
    try {
      if (!providerRef.current) return;
      await AsyncStorage.setItem(`appliedJobs:${providerRef.current}`, JSON.stringify(jobs));
    } catch (error) {
      console.error('Error saving applied jobs:', error);
    }
  };

  const saveAvailablePosts = async (posts) => {
    try {
      if (!providerRef.current) return;
      await AsyncStorage.setItem(`availablePosts:${providerRef.current}`, JSON.stringify(posts));
    } catch (error) {
      console.error('Error saving available posts:', error);
    }
  };

  // Apply to a job - removes from available and adds to applied
  const applyToJob = (post) => {
    if (!providerRef.current || loading) return false;
    const alreadyApplied = appliedJobs.find((j) => j.id === post.id);
    if (alreadyApplied) return false;

    // Remove from available posts
    setAvailablePosts((prev) => {
      const updated = prev.filter((p) => p.id !== post.id);
      saveAvailablePosts(updated);
      return updated;
    });

    // Add to applied jobs with PENDING status
    const newAppliedJobs = [
      ...appliedJobs,
      {
        ...post,
        status: JOB_STATUS.PENDING.key,
        appliedAt: new Date().toISOString(),
      },
    ];
    setAppliedJobs(newAppliedJobs);
    saveAppliedJobs(newAppliedJobs);
    
    return true;
  };

  // Get status of a specific job
  const getJobStatus = (postId) => {
    const job = appliedJobs.find((j) => j.id === postId);
    return job ? job.status : null;
  };

  // Check if applied
  const isApplied = (postId) => appliedJobs.some((j) => j.id === postId);

  // Update status
  const updateJobStatus = (postId, newStatus) => {
    setAppliedJobs((prev) => {
      const updated = prev.map((job) =>
        job.id === postId ? { ...job, status: newStatus } : job
      );
      saveAppliedJobs(updated);
      return updated;
    });
  };

  // Get jobs by status
  const getJobsByStatus = (status) => {
    if (status === 'all') return appliedJobs;
    return appliedJobs.filter(job => job.status === status);
  };

  // Get counts by status
  const getStatusCounts = () => {
    return {
      all: appliedJobs.length,
      pending: appliedJobs.filter(job => job.status === JOB_STATUS.PENDING.key).length,
      selected: appliedJobs.filter(job => job.status === JOB_STATUS.SELECTED.key).length,
      rejected: appliedJobs.filter(job => job.status === JOB_STATUS.REJECTED.key).length,
      taken: appliedJobs.filter(job => job.status === JOB_STATUS.TAKEN.key).length,
      expired: appliedJobs.filter(job => job.status === JOB_STATUS.EXPIRED.key).length,
    };
  };

  return (
    <AppliedJobsContext.Provider value={{
      appliedJobs,
      availablePosts,
      loading,
      applyToJob,
      getJobStatus,
      isApplied,
      updateJobStatus,
      getJobsByStatus,
      getStatusCounts,
    }}>
      {children}
    </AppliedJobsContext.Provider>
  );
}

export const useAppliedJobs = () => useContext(AppliedJobsContext);
