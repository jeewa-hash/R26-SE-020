import React, { createContext, useState, useContext } from 'react';
import { JOB_STATUS } from '../constants/jobStatus';

const AppliedJobsContext = createContext();

export function AppliedJobsProvider({ children }) {
  const [appliedJobs, setAppliedJobs] = useState([]);

  // Apply to a job
  const applyToJob = (post) => {
    const alreadyApplied = appliedJobs.find((j) => j.id === post.id);
    if (alreadyApplied) return;

    setAppliedJobs((prev) => [
      ...prev,
      {
        ...post,
        status: JOB_STATUS.PENDING.key,
        appliedAt: new Date().toISOString(),
      },
    ]);
  };

  // Get status of a specific job
  const getJobStatus = (postId) => {
    const job = appliedJobs.find((j) => j.id === postId);
    return job ? job.status : null;
  };

  // Check if applied
  const isApplied = (postId) => appliedJobs.some((j) => j.id === postId);

  // Update status (will be called from backend later)
  const updateJobStatus = (postId, newStatus) => {
    setAppliedJobs((prev) =>
      prev.map((job) =>
        job.id === postId ? { ...job, status: newStatus } : job
      )
    );
  };

  return (
    <AppliedJobsContext.Provider value={{
      appliedJobs,
      applyToJob,
      getJobStatus,
      isApplied,
      updateJobStatus,
    }}>
      {children}
    </AppliedJobsContext.Provider>
  );
}

export const useAppliedJobs = () => useContext(AppliedJobsContext);