import React, { useState } from "react";
import { useCandidates, useCandidateMatches, useDownload } from "../hooks/useAPI";
import Spinner from "./Spinner";

export default function CandidatesPage() {
  // ============================================================================
  // State Management
  // ============================================================================
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [minScore, setMinScore] = useState(70);

  // ============================================================================
  // API Hooks
  // ============================================================================
  const { candidates, loading: candidatesLoading, error: candidatesError } = useCandidates();

  const {
    matches,
    loading: matchesLoading,
    error: matchesError,
    loadMatches
  } = useCandidateMatches(selectedCandidate?.id, { minScore });

  const { download, loading: downloadLoading, error: downloadError } = useDownload();

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCandidateSelect = async (candidate) => {
    setSelectedCandidate(candidate);
    loadMatches();
  };

  const handleMinScoreChange = (e) => {
    const newScore = Number(e.target.value);
    setMinScore(newScore);

    // Reload matches if candidate is selected
    if (selectedCandidate) {
      loadMatches();
    }
  };

  const handleDownloadResume = async () => {
    if (!selectedCandidate) return;

    try {
      await download(
        () => candidatesAPI.downloadResume(selectedCandidate.id),
        `${selectedCandidate.name}_resume`
      );
    } catch (err) {
      if (err.response?.status === 404) {
        alert("Resume not found. This candidate hasn't uploaded a resume yet.");
      } else {
        alert(`Resume download failed: ${err.message}`);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedCandidate(null);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  if (candidatesLoading) {
    return (
      <div className="w-full max-w-6xl">
        <Spinner />
        <p className="text-center mt-4">Loading candidates...</p>
      </div>
    );
  }

  if (candidatesError) {
    return (
      <div className="w-full max-w-6xl bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Candidates</h2>
        <p className="text-red-600">{candidatesError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-center">
        Candidate ↔ Job Matching
      </h1>

      {/* Score Filter */}
      <div className="flex justify-center gap-4 items-center">
        <label className="font-medium">Minimum match score:</label>
        <input
          type="number"
          className="border rounded px-3 py-2 w-24"
          value={minScore}
          onChange={handleMinScoreChange}
          min="0"
          max="100"
        />
        <span className="text-gray-600 text-sm">%</span>
      </div>

      {/* Candidates Grid */}
      {candidates.length === 0 ? (
        <div className="text-center text-gray-500 py-10">
          <p className="text-xl mb-4">No candidates found</p>
          <p className="text-sm">Create a candidate to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onClick={() => handleCandidateSelect(candidate)}
            />
          ))}
        </div>
      )}

      {/* Candidate Detail Modal */}
      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          matches={matches}
          matchesLoading={matchesLoading}
          matchesError={matchesError}
          minScore={minScore}
          onClose={handleCloseModal}
          onDownloadResume={handleDownloadResume}
          downloadLoading={downloadLoading}
        />
      )}
    </div>
  );
}

// ============================================================================
// Candidate Card Component
// ============================================================================

function CandidateCard({ candidate, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-4 border rounded-lg bg-white shadow hover:shadow-lg hover:bg-blue-50 text-left transition-all"
    >
      <div className="font-bold text-lg">{candidate.name}</div>
      <div className="text-sm text-gray-600 mt-1">📍 {candidate.location}</div>
      {candidate.email && (
        <div className="text-sm text-gray-500 mt-1">✉️ {candidate.email}</div>
      )}
      <div className="text-sm text-gray-500 mt-2">
        💰 {candidate.salary_expectation ? `${candidate.salary_expectation.toLocaleString()} ₪` : "Not specified"}
      </div>
    </button>
  );
}

// ============================================================================
// Candidate Modal Component
// ============================================================================

function CandidateModal({
  candidate,
  matches,
  matchesLoading,
  matchesError,
  minScore,
  onClose,
  onDownloadResume,
  downloadLoading,
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-start p-10 overflow-auto z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center sticky top-0 bg-white pb-4 border-b">
          <h2 className="text-2xl font-bold">{candidate.name}</h2>
          <button
            onClick={onClose}
            className="text-red-600 hover:text-red-800 font-bold text-2xl"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Candidate Info */}
        <div className="space-y-3">
          <InfoRow label="Location" value={candidate.location} />
          <InfoRow label="Email" value={candidate.email || "Not provided"} />
          <InfoRow label="Phone" value={candidate.phone || "Not provided"} />
          <InfoRow label="Year of Birth" value={candidate.year_of_birth || "Not provided"} />
          <InfoRow
            label="Salary Expectation"
            value={candidate.salary_expectation ? `${candidate.salary_expectation.toLocaleString()} ₪` : "Not specified"}
          />

          <div>
            <strong className="font-semibold">Education:</strong>
            <pre className="bg-gray-100 p-3 rounded mt-1 whitespace-pre-wrap text-sm">
              {candidate.education || "Not provided"}
            </pre>
          </div>

          {candidate.experience && candidate.experience.length > 0 && (
            <div>
              <strong className="font-semibold">Experience:</strong>
              <ul className="list-disc ml-6 mt-1">
                {candidate.experience.map((exp, i) => (
                  <li key={i} className="text-sm">{exp}</li>
                ))}
              </ul>
            </div>
          )}

          {candidate.languages && candidate.languages.length > 0 && (
            <div>
              <strong className="font-semibold">Languages:</strong>
              <ul className="list-disc ml-6 mt-1">
                {candidate.languages.map((lang, i) => (
                  <li key={i} className="text-sm">{lang}</li>
                ))}
              </ul>
            </div>
          )}

          {candidate.skills && candidate.skills.length > 0 && (
            <div>
              <strong className="font-semibold">Skills:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {candidate.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download Resume Button */}
        <button
          onClick={onDownloadResume}
          disabled={downloadLoading}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {downloadLoading ? "Downloading..." : "📥 Download Resume"}
        </button>

        <hr className="my-4" />

        {/* Matching Jobs Section */}
        <div>
          <h3 className="text-xl font-semibold mb-3">
            Matching Jobs {minScore > 0 && `(${minScore}%+ match)`}
          </h3>

          {matchesLoading && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}

          {matchesError && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-600">
              <strong>Error:</strong> {matchesError}
            </div>
          )}

          {!matchesLoading && !matchesError && matches.length === 0 && (
            <div className="text-gray-500 text-center py-6">
              No matching jobs found above {minScore}%
            </div>
          )}

          {!matchesLoading && !matchesError && matches.length > 0 && (
            <div className="space-y-3">
              {matches.map((match, i) => (
                <MatchCard key={i} match={match} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <strong className="font-semibold min-w-[140px]">{label}:</strong>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function MatchCard({ match }) {
  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-100 border-green-300 text-green-800";
    if (score >= 60) return "bg-yellow-100 border-yellow-300 text-yellow-800";
    return "bg-red-100 border-red-300 text-red-800";
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-lg">{match.job.title}</div>
          <div className="text-sm text-gray-600">📍 {match.job.location}</div>
        </div>
        <div className={`px-3 py-1 rounded-full font-semibold border ${getScoreColor(match.score)}`}>
          {match.score}%
        </div>
      </div>

      <div className="flex gap-4 mt-3 flex-wrap">
        <ScorePill label="Semantic" value={match.semantic_score} color="blue" />
        <ScorePill label="Rules" value={match.rule_score} color="purple" />
      </div>

      {match.match_reasons && match.match_reasons.length > 0 && (
        <div className="mt-3 text-sm">
          <strong className="text-gray-700">Match Reasons:</strong>
          <ul className="list-disc ml-5 mt-1 text-gray-600">
            {match.match_reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScorePill({ label, value, color = "gray" }) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    gray: "bg-gray-100 text-gray-800",
  };

  return (
    <span className={`px-3 py-1 rounded text-sm ${colorClasses[color]}`}>
      <strong>{label}:</strong> {value}%
    </span>
  );
}