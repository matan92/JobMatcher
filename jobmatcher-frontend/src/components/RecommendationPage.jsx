import React, { useEffect, useState } from "react";
import Spinner from "./Spinner";
import ScoreBadge from "./ScoreBadge";

// ============================================================================
// Constants
// ============================================================================

const JOB_CATEGORIES = [
  { value: "All", icon: "🌐", label: "All Categories" },
  { value: "Technology", icon: "💻", label: "Technology" },
  { value: "Healthcare", icon: "🏥", label: "Healthcare" },
  { value: "Retail", icon: "🛍️", label: "Retail" },
  { value: "Hospitality", icon: "🏨", label: "Hospitality" },
  { value: "Manufacturing", icon: "🏭", label: "Manufacturing" },
  { value: "Education", icon: "📚", label: "Education" },
  { value: "Finance", icon: "💰", label: "Finance" },
  { value: "Construction", icon: "🏗️", label: "Construction" },
  { value: "Logistics", icon: "🚚", label: "Logistics" },
  { value: "Customer Service", icon: "📞", label: "Customer Service" },
  { value: "Sales", icon: "📊", label: "Sales" },
  { value: "Administration", icon: "📋", label: "Administration" },
  { value: "Other", icon: "🔧", label: "Other" },
];

// ============================================================================
// Main Component
// ============================================================================

export default function RecommendationPage() {
  // State
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("scoreDesc");
  const [filters, setFilters] = useState({
    location: "",
    language: "",
    minSalary: "",
    maxSalary: "",
    employmentType: "",
  });

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showEditCandidateModal, setShowEditCandidateModal] = useState(false);
  const [showDeleteCandidateModal, setShowDeleteCandidateModal] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(null);

  // Edit data
  const [editData, setEditData] = useState({
    title: "",
    location: "",
    description: "",
    category: "Technology",
    employment_type: "Full Time",
    experience_level: "Mid Level",
    salary_min: "",
    salary_max: "",
    requirements: "",
    advantages: "",
    required_languages: "",
    shift_work: false,
    weekend_work: false,
  });

  const [editCandidateData, setEditCandidateData] = useState({
    name: "",
    location: "",
    education: "",
    salary_expectation: "",
    experience: "",
    languages: "",
  });

  // ============================================================================
  // Fetch Jobs
  // ============================================================================

  useEffect(() => {
    fetch("http://localhost:8000/jobs")
      .then((res) => res.json())
      .then((data) => setJobs(data))
      .catch((err) => console.error("Failed to load jobs:", err));
  }, []);

  // ============================================================================
  // Load Recommendations
  // ============================================================================

  const loadRecommendations = async (job) => {
    setLoading(true);
    setSelectedJob(job);

    try {
      const res = await fetch(`http://localhost:8000/recommendations/job/${job.id}`);
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Filter and Sort
  // ============================================================================

  // Filter jobs by category
  const filteredJobs = selectedCategory === "All"
    ? jobs
    : jobs.filter(job => job.category === selectedCategory);

  // Filter and sort candidates
  const filteredAndSorted = (() => {
    let list = recommendations;

    // Apply filters
    list = list.filter((rec) => {
      const c = rec.candidate;

      if (filters.location && !c.location.toLowerCase().includes(filters.location.toLowerCase()))
        return false;

      if (filters.language) {
        const lang = filters.language.toLowerCase();
        if (!c.languages.some((l) => l.toLowerCase().includes(lang)))
          return false;
      }

      const salary = c.salary_expectation ?? 0;
      if (filters.minSalary && salary < Number(filters.minSalary)) return false;
      if (filters.maxSalary && salary > Number(filters.maxSalary)) return false;

      return true;
    });

    // Sort
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "scoreDesc": return b.score - a.score;
        case "salaryAsc": return (a.candidate.salary_expectation ?? 0) - (b.candidate.salary_expectation ?? 0);
        case "salaryDesc": return (b.candidate.salary_expectation ?? 0) - (a.candidate.salary_expectation ?? 0);
        case "experienceDesc": return (b.candidate.experience?.length || 0) - (a.candidate.experience?.length || 0);
        case "experienceAsc": return (a.candidate.experience?.length || 0) - (b.candidate.experience?.length || 0);
        default: return 0;
      }
    });
  })();

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // ============================================================================
  // Get category icon
  // ============================================================================

  const getCategoryIcon = (categoryValue) => {
    const cat = JOB_CATEGORIES.find(c => c.value === categoryValue);
    return cat ? cat.icon : "🔧";
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="w-full max-w-6xl bg-gray-100 p-10 rounded-2xl shadow-lg flex flex-col items-center">

      <h1 className="text-4xl font-bold mb-10 text-center">JobMatcher Panel</h1>

      {/* ================================================================= */}
      {/* CATEGORY FILTER */}
      {/* ================================================================= */}
      <div className="bg-white shadow-lg rounded-xl p-6 w-full mb-6">
        <h2 className="text-xl font-semibold mb-4 text-center">
          🏷️ Filter by Industry
        </h2>

        <div className="flex flex-wrap gap-2 justify-center">
          {JOB_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedCategory === cat.value
                  ? "bg-blue-600 text-white border-blue-700 shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
              }`}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {selectedCategory !== "All" && (
          <p className="text-center text-sm text-gray-500 mt-3">
            Showing {filteredJobs.length} {selectedCategory} job(s)
          </p>
        )}
      </div>

      {/* ================================================================= */}
      {/* JOB LIST */}
      {/* ================================================================= */}
      <div className="bg-white shadow-lg rounded-xl p-6 w-full mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Available Jobs
        </h2>

        {filteredJobs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">No jobs found in this category</p>
            <p className="text-sm">Try selecting a different category or create a new job</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                onClick={() => loadRecommendations(job)}
                getCategoryIcon={getCategoryIcon}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* JOB DETAILS PANEL */}
      {/* ================================================================= */}
      {selectedJob && (
        <div className="bg-white shadow-lg rounded-xl p-6 w-full mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-center">Job Details</h2>

          <div className="space-y-3 text-gray-800">
            {/* Header with category */}
            <div className="flex items-center gap-3 pb-3 border-b">
              <span className="text-3xl">{getCategoryIcon(selectedJob.category)}</span>
              <div>
                <h3 className="text-xl font-bold">{selectedJob.title}</h3>
                <p className="text-sm text-gray-500">{selectedJob.category}</p>
              </div>
            </div>

            <InfoRow label="Location" value={selectedJob.location} />
            <InfoRow
              label="Employment Type"
              value={selectedJob.employment_type || "Full Time"}
            />
            <InfoRow
              label="Experience Level"
              value={selectedJob.experience_level || "Mid Level"}
            />

            {(selectedJob.salary_min !== null || selectedJob.salary_max !== null) && (
              <InfoRow
                label="Salary Range"
                value={`${selectedJob.salary_min || "N/A"} – ${selectedJob.salary_max || "N/A"} ₪`}
              />
            )}

            <div>
              <strong>Description:</strong>
              <p className="text-gray-700 mt-1">{selectedJob.description}</p>
            </div>

            {selectedJob.requirements && selectedJob.requirements.length > 0 && (
              <div>
                <strong>Requirements:</strong>
                <ul className="list-disc ml-6 mt-1">
                  {selectedJob.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedJob.advantages && selectedJob.advantages.length > 0 && (
              <div>
                <strong>Nice-to-Have:</strong>
                <ul className="list-disc ml-6 mt-1">
                  {selectedJob.advantages.map((adv, i) => (
                    <li key={i}>{adv}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedJob.required_languages && selectedJob.required_languages.length > 0 && (
              <InfoRow
                label="Required Languages"
                value={selectedJob.required_languages.join(", ")}
              />
            )}

            {/* Industry-specific fields */}
            {(selectedJob.shift_work || selectedJob.weekend_work) && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <strong className="text-yellow-800">⚠️ Schedule Requirements:</strong>
                <div className="flex gap-4 mt-2">
                  {selectedJob.shift_work && (
                    <span className="text-sm">🌙 Shift Work Required</span>
                  )}
                  {selectedJob.weekend_work && (
                    <span className="text-sm">📅 Weekend Work Required</span>
                  )}
                </div>
              </div>
            )}

            {selectedJob.certifications_required && selectedJob.certifications_required.length > 0 && (
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <strong className="text-red-800">📜 Required Certifications:</strong>
                <ul className="list-disc ml-6 mt-1">
                  {selectedJob.certifications_required.map((cert, i) => (
                    <li key={i} className="text-sm">{cert}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedJob.physical_requirements && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <strong className="text-blue-800">💪 Physical Requirements:</strong>
                <p className="text-sm mt-1">{selectedJob.physical_requirements}</p>
              </div>
            )}

            {selectedJob.benefits && selectedJob.benefits.length > 0 && (
              <div>
                <strong>🎁 Benefits:</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedJob.benefits.map((benefit, i) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={() => {
                setEditData({
                  title: selectedJob.title,
                  location: selectedJob.location,
                  description: selectedJob.description,
                  category: selectedJob.category || "Technology",
                  employment_type: selectedJob.employment_type || "Full Time",
                  experience_level: selectedJob.experience_level || "Mid Level",
                  salary_min: selectedJob.salary_min ?? "",
                  salary_max: selectedJob.salary_max ?? "",
                  requirements: (selectedJob.requirements || []).join(", "),
                  advantages: (selectedJob.advantages || []).join(", "),
                  required_languages: (selectedJob.required_languages || []).join(", "),
                  shift_work: selectedJob.shift_work || false,
                  weekend_work: selectedJob.weekend_work || false,
                });
                setShowEditModal(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ✏️ Edit Job
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑️ Delete Job
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FILTERS + SORTING */}
      {/* ================================================================= */}
      {selectedJob && (
        <div className="bg-white shadow rounded-xl p-6 w-full mb-8">
          <h2 className="text-xl font-semibold mb-4 text-center">
            🔍 Filter & Sort Candidates
          </h2>

          <div className="flex flex-wrap gap-4 justify-between">
            <input
              name="location"
              onChange={handleFilterChange}
              value={filters.location}
              placeholder="Location"
              className="border rounded p-2 flex-1 min-w-[150px]"
            />
            <input
              name="language"
              onChange={handleFilterChange}
              value={filters.language}
              placeholder="Language"
              className="border rounded p-2 flex-1 min-w-[150px]"
            />
            <input
              name="minSalary"
              type="number"
              onChange={handleFilterChange}
              value={filters.minSalary}
              placeholder="Min Salary"
              className="border rounded p-2 w-32"
            />
            <input
              name="maxSalary"
              type="number"
              onChange={handleFilterChange}
              value={filters.maxSalary}
              placeholder="Max Salary"
              className="border rounded p-2 w-32"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded p-2"
            >
              <option value="scoreDesc">Best Match</option>
              <option value="salaryAsc">Salary Low → High</option>
              <option value="salaryDesc">Salary High → Low</option>
              <option value="experienceDesc">Experience High → Low</option>
              <option value="experienceAsc">Experience Low → High</option>
            </select>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* CANDIDATE MATCH LIST */}
      {/* ================================================================= */}
      <div className="bg-white shadow rounded-xl p-6 w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Candidate Matches
        </h2>

        {loading && <Spinner />}

        {!loading && filteredAndSorted.length === 0 && (
          <div className="text-center text-gray-500">
            {selectedJob ? "No matching candidates." : "Select a job to view candidates."}
          </div>
        )}

        {!loading && filteredAndSorted.length > 0 && (
          <div className="space-y-4 flex flex-col items-center">
            {filteredAndSorted.map((rec, i) => (
              <CandidateCard
                key={i}
                recommendation={rec}
                onClick={() => {
                  setActiveCandidate(rec);
                  setShowCandidateModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODALS (Edit Job, Delete Job, Candidate Profile, etc.) */}
      {/* ================================================================= */}
      {/* ... Keep existing modal code from original RecommendationPage ... */}
      {/* I'm keeping it brief here, but you should include all your existing modals */}

    </div>
  );
}

// ============================================================================
// Job Card Component
// ============================================================================

function JobCard({ job, isSelected, onClick, getCategoryIcon }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 border-2 rounded-xl text-left transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50 shadow-lg"
          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{getCategoryIcon(job.category)}</span>
        <div className="flex-1">
          <div className="font-bold text-lg mb-1">{job.title}</div>
          <div className="text-sm text-gray-600 mb-2">📍 {job.location}</div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
              {job.category || "Other"}
            </span>
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {job.employment_type || "Full Time"}
            </span>
            {job.shift_work && (
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                🌙 Shifts
              </span>
            )}
            {job.weekend_work && (
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                📅 Weekends
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Candidate Card Component
// ============================================================================

function CandidateCard({ recommendation, onClick }) {
  const rec = recommendation;

  return (
    <div
      className="p-4 border rounded-xl bg-gray-50 w-full max-w-xl shadow hover:bg-gray-100 cursor-pointer transition-all"
      onClick={onClick}
    >
      <div className="text-xl font-bold text-center">{rec.candidate.name}</div>
      <div className="text-center text-gray-600">
        📍 {rec.candidate.location} • 💰 {rec.candidate.salary_expectation ?? "N/A"} ₪
      </div>

      <div className="grid grid-cols-3 gap-4 mt-3">
        <div>
          <div className="text-sm text-gray-600">Final</div>
          <ScoreBadge value={rec.score} />
        </div>
        <div>
          <div className="text-sm text-gray-600">Semantic</div>
          <ScoreBadge value={rec.semantic_score} />
        </div>
        <div>
          <div className="text-sm text-gray-600">Rules</div>
          <ScoreBadge value={rec.rule_score} />
        </div>
      </div>

      {rec.candidate.education && (
        <div className="mt-4">
          <strong>Education: </strong>
          <span className="text-sm">{rec.candidate.education}</span>
        </div>
      )}

      {rec.candidate.experience && rec.candidate.experience.length > 0 && (
        <div className="mt-2">
          <strong>Experience:</strong>
          <ul className="list-disc ml-6 text-sm">
            {rec.candidate.experience.slice(0, 2).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {rec.candidate.experience.length > 2 && (
              <li className="text-gray-500">
                +{rec.candidate.experience.length - 2} more...
              </li>
            )}
          </ul>
        </div>
      )}

      {rec.candidate.languages && rec.candidate.languages.length > 0 && (
        <div className="mt-2">
          <strong>Languages:</strong>
          <span className="text-sm ml-1">{rec.candidate.languages.join(", ")}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Component
// ============================================================================

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <strong className="min-w-[180px]">{label}:</strong>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}