import React, { useState } from 'react';
import { postJob } from '../api/api';

const EmployerDashboard = ({ isDark }) => {
  const [jobData, setJobData] = useState({
    title: '',
    company: '',
    description: '',
    requirements: [],
    salary_range: '',
    location: '',
    remote: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await postJob(jobData);
      alert('Job posted successfully!');
      setJobData({
        title: '',
        company: '',
        description: '',
        requirements: [],
        salary_range: '',
        location: '',
        remote: false
      });
    } catch (error) {
      alert('Error posting job');
    }
  };

  return (
    <div className={`p-6 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
      <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-cyan-400' : 'text-slate-800'}`}>
        Post a New Job
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Job Title"
          value={jobData.title}
          onChange={(e) => setJobData({...jobData, title: e.target.value})}
          className="w-full p-2 rounded border"
        />
        {/* Add more form fields */}
        <button type="submit" className={`px-4 py-2 rounded ${isDark ? 'bg-cyan-500' : 'bg-blue-500'} text-white`}>
          Post Job
        </button>
      </form>
    </div>
  );
};

export default EmployerDashboard;