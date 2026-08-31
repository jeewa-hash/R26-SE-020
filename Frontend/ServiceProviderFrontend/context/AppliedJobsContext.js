import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JOB_STATUS } from '../constants/jobStatus';

const AppliedJobsContext = createContext();

export function AppliedJobsProvider({ children }) {
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [availablePosts, setAvailablePosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedApplied = await AsyncStorage.getItem('appliedJobs');
      const storedAvailable = await AsyncStorage.getItem('availablePosts');
      
      if (storedApplied) {
        const savedApplications = JSON.parse(storedApplied);
        // Remove applications created from the old feedData demo posts.
        // Real seeker posts use MongoDB ObjectId values.
        const realApplications = Array.isArray(savedApplications)
          ? savedApplications.filter((job) => !['1', '2', '3', '4', '5'].includes(String(job.id)))
          : [];
        setAppliedJobs(realApplications);
        if (realApplications.length !== savedApplications.length) {
          await AsyncStorage.setItem('appliedJobs', JSON.stringify(realApplications));
        }
      }
      if (storedAvailable) setAvailablePosts(JSON.parse(storedAvailable));
      else setAvailablePosts([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAppliedJobs = async (jobs) => {
    try {
      await AsyncStorage.setItem('appliedJobs', JSON.stringify(jobs));
    } catch (error) {
      console.error('Error saving applied jobs:', error);
    }
  };

  const saveAvailablePosts = async (posts) => {
    try {
      await AsyncStorage.setItem('availablePosts', JSON.stringify(posts));
    } catch (error) {
      console.error('Error saving available posts:', error);
    }
  };

  // Apply to a job - removes from available and adds to applied
  const applyToJob = (post) => {
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
