import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ResumeBuilder() {
  return <Navigate to="/dashboard/resume/templates" replace />;
}