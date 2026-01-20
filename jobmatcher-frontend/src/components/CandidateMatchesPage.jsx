import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

export default function CandidateMatchesPage() {
  const { id } = useParams();

  const [matches, setMatches] = useState([]);
  const [candidateName, setCandidateName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        // 1️⃣ Fetch candidate (for header)
        const candRes = await axios.get(
          `http://localhost:8000/candidates/${id}`
        );
        setCandidateName(candRes.data.name);

        // 2️⃣ Fetch matching jobs
        const matchRes = await axios.get(
          `http://localhost:8000/candidates/${id}/matches`, {
            params: { min_score: 70 }
        });
        setMatches(matchRes.data);
      } catch (err) {
        console.error("Failed to load matches", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [id]);

  if (loading) {
    return <div className="text-lg">Loading matching jobs...</div>;
  }

  return (
    <div className="w-full max-w-5xl bg-white p-6 rounded-xl shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Matching Jobs for {candidateName}
        </h1>
        <Link
          to="/candidates"
          className="text-blue-600 hover:underline"
        >
          ← Back to Candidates
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="text-gray-500 text-center">
          No matching jobs found.
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Job</th>
              <th className="text-left p-3">Location</th>
              <th className="text-center p-3">Match %</th>
              <th className="text-center p-3">Semantic</th>
              <th className="text-center p-3">Rules</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">
                  {m.job.title}
                </td>
                <td className="p-3">
                  {m.job.location}
                </td>
                <td className="p-3 text-center font-semibold">
                  {m.score}%
                </td>
                <td className="p-3 text-center">
                  {m.semantic_score}%
                </td>
                <td className="p-3 text-center">
                  {m.rule_score}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
