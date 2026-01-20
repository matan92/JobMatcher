import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MatchingDashboard() {
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // mode = "job" → show candidates for job
  // mode = "candidate" → show jobs for candidate
  const [mode, setMode] = useState("job");

  // --------------------------------
  // INITIAL LOAD
  // --------------------------------
  useEffect(() => {
    axios.get("http://localhost:8000/jobs").then(res => setJobs(res.data));
    axios.get("http://localhost:8000/candidates").then(res => setCandidates(res.data));
  }, []);

  // --------------------------------
  // LOAD MATCHES
  // --------------------------------
  const loadMatchesForJob = async (job) => {
    setSelectedJob(job);
    setSelectedCandidate(null);
    setSelectedMatch(null);
    setMode("job");

    const res = await axios.get(
      `http://localhost:8000/match/job/${job.id}`
    );
    setMatches(res.data);
  };

  const loadMatchesForCandidate = async (candidate) => {
    setSelectedCandidate(candidate);
    setSelectedJob(null);
    setSelectedMatch(null);
    setMode("candidate");

    const res = await axios.get(
      `http://localhost:8000/match/candidate/${candidate.id}`
    );
    setMatches(res.data);
  };

  // --------------------------------
  // RENDER
  // --------------------------------
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Job ↔ Candidate Matching
      </h1>

      <div className="grid grid-cols-4 gap-6">

        {/* LEFT COLUMN – JOBS */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-3">Jobs</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => loadMatchesForJob(job)}
                className={`p-3 border rounded cursor-pointer ${
                  selectedJob?.id === job.id ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <div className="font-medium">{job.title}</div>
                <div className="text-sm text-gray-500">{job.location}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE LEFT – CANDIDATES */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-3">Candidates</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {candidates.map(cand => (
              <div
                key={cand.id}
                onClick={() => loadMatchesForCandidate(cand)}
                className={`p-3 border rounded cursor-pointer ${
                  selectedCandidate?.id === cand.id ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <div className="font-medium">{cand.name}</div>
                <div className="text-sm text-gray-500">{cand.location}</div>
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE RIGHT – MATCHES */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-3">Matches</h2>

          {!matches.length && (
            <div className="text-gray-500">
              Select a job or candidate
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {matches.map((m, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedMatch(m)}
                className={`border rounded-lg p-3 cursor-pointer ${
                  selectedMatch === m ? "border-blue-500 bg-blue-50" : ""
                }`}
              >
                <div className="font-medium">
                  {mode === "job"
                    ? m.candidate.name
                    : m.job.title}
                </div>

                <div className="text-sm text-gray-500">
                  Score: {m.score}%
                </div>

                <div className="text-xs text-gray-400">
                  Semantic: {m.semantic_score}% | Rules: {m.rule_score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT – DETAILS PANEL */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-4">Details</h2>

          {!selectedMatch && (
            <div className="text-gray-500">
              Select a match to view details
            </div>
          )}

          {selectedMatch && mode === "job" && (
            <>
              <h3 className="font-semibold text-lg">
                {selectedMatch.candidate.name}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {selectedMatch.candidate.location}
              </p>

              <Section title="Education">
                {selectedMatch.candidate.education}
              </Section>

              <Section title="Experience">
                <ul className="list-disc pl-4">
                  {selectedMatch.candidate.experience.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </Section>

              <Section title="Languages">
                <ul className="list-disc pl-4">
                  {selectedMatch.candidate.languages.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </Section>
            </>
          )}

          {selectedMatch && mode === "candidate" && (
            <>
              <h3 className="font-semibold text-lg">
                {selectedMatch.job.title}
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                {selectedMatch.job.location}
              </p>

              <Section title="Description">
                {selectedMatch.job.description}
              </Section>

              <Section title="Requirements">
                <ul className="list-disc pl-4">
                  {selectedMatch.job.requirements.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Section>

              <Section title="Advantages">
                <ul className="list-disc pl-4">
                  {selectedMatch.job.advantages.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// --------------------------------
// SMALL HELPER COMPONENT
// --------------------------------
function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="font-medium mb-1">{title}</div>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}
