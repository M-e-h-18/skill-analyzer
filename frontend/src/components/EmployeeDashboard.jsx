import React, { useState, useEffect } from 'react';
import { getJobs } from '../api/api';

const EmployeeDashboard = ({ isDark }) => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await getJobs();
        setJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-cyan-400' : 'text-slate-800'}`}>
        Available Jobs
      </h2>
      {jobs.map((job) => (
        <div key={job.id} className={`p-4 rounded-lg border ${isDark ? 'border-cyan-400/20 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
          <h3 className="text-xl font-semibold">{job.title}</h3>
          <p className="text-sm opacity-75">{job.company}</p>
          <p className="mt-2">{job.description}</p>
          <div className="mt-2 flex gap-2">
            <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-800">
              {job.location}
            </span>
            {job.remote && (
              <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-800">
                Remote
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmployeeDashboard;