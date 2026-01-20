import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import RecommendationPage from "./components/RecommendationPage";
import JobForm from "./components/JobForm";
import CandidateForm from "./components/CandidateForm";

// ✅ NEW IMPORT
import CandidatesPage from "./components/CandidatesPage";
import CandidateMatchesPage from "./components/CandidateMatchesPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow p-4 flex gap-8 justify-center text-lg font-semibold">
        <Link to="/" className="text-blue-600 hover:underline">Jobs</Link>
        <Link to="/candidates" className="text-blue-600 hover:underline">Candidates</Link>
        <Link to="/create-job" className="text-blue-600 hover:underline">Create Job</Link>
        <Link to="/create-candidate" className="text-blue-600 hover:underline">Create Candidate</Link>
      </nav>

      {/* Routed Pages */}
      <div className="p-10 flex justify-center">
        <Routes>
          <Route path="/" element={<RecommendationPage />} />
          <Route path="/create-job" element={<JobForm />} />
          <Route path="/create-candidate" element={<CandidateForm />} />

          {/* ✅ NEW ROUTES */}
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route
            path="/candidates/:id/matches"
            element={<CandidateMatchesPage />}
          />
        </Routes>
      </div>
    </div>
  );
}
