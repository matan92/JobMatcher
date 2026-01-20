import React, { useState } from "react";

const JOB_CATEGORIES = [
  { value: "Technology", icon: "💻", label: "Technology", color: "blue" },
  { value: "Healthcare", icon: "🏥", label: "Healthcare", color: "red" },
  { value: "Retail", icon: "🛍️", label: "Retail", color: "purple" },
  { value: "Hospitality", icon: "🏨", label: "Hospitality", color: "pink" },
  { value: "Manufacturing", icon: "🏭", label: "Manufacturing", color: "gray" },
  { value: "Education", icon: "📚", label: "Education", color: "green" },
  { value: "Finance", icon: "💰", label: "Finance", color: "yellow" },
  { value: "Construction", icon: "🏗️", label: "Construction", color: "orange" },
  { value: "Logistics", icon: "🚚", label: "Logistics", color: "indigo" },
  { value: "Customer Service", icon: "📞", label: "Customer Service", color: "teal" },
  { value: "Sales", icon: "📊", label: "Sales", color: "cyan" },
  { value: "Administration", icon: "📋", label: "Administration", color: "slate" },
  { value: "Other", icon: "🔧", label: "Other", color: "gray" },
];

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Temporary", "Internship", "Freelance"];
const EXPERIENCE_LEVELS = ["No Experience Required", "Entry Level", "Junior", "Mid Level", "Senior", "Executive"];

export default function JobForm() {
  const [loading, setLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [jobText, setJobText] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
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
    certifications_required: "",
    physical_requirements: "",
    shift_work: false,
    weekend_work: false,
    benefits: "",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  const parseJobDescription = async () => {
    if (!jobText.trim()) {
      setError("Please enter a job description to parse");
      return;
    }

    setParseLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8000/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: jobText }),
      });

      if (!res.ok) throw new Error("Failed to parse job description");

      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        title: data.title || prev.title,
        location: data.location || prev.location,
        description: data.description || jobText,
        salary_min: data.salary_min || prev.salary_min,
        salary_max: data.salary_max || prev.salary_max,
        experience_level: data.experience_level || prev.experience_level,
        employment_type: data.job_type || prev.employment_type,
        requirements: (data.skills || []).join(", "),
        required_languages: (data.languages || []).join(", "),
      }));
    } catch (err) {
      setError("Failed to parse job description. Please fill manually.");
    } finally {
      setParseLoading(false);
    }
  };

  const submitJob = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title || !form.location || !form.description) {
      setError("Please fill in all required fields");
      return;
    }

    const payload = {
      title: form.title,
      location: form.location,
      description: form.description,
      category: form.category,
      employment_type: form.employment_type,
      experience_level: form.experience_level,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      requirements: form.requirements.split(",").map((s) => s.trim()).filter(Boolean),
      advantages: form.advantages.split(",").map((s) => s.trim()).filter(Boolean),
      required_languages: form.required_languages.split(",").map((l) => l.trim()).filter(Boolean),
      certifications_required: form.certifications_required.split(",").map((c) => c.trim()).filter(Boolean),
      physical_requirements: form.physical_requirements || null,
      shift_work: form.shift_work,
      weekend_work: form.weekend_work,
      benefits: form.benefits.split(",").map((b) => b.trim()).filter(Boolean),
    };

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create job");

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Reset form
      setForm({
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
        certifications_required: "",
        physical_requirements: "",
        shift_work: false,
        weekend_work: false,
        benefits: "",
      });
      setJobText("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError("Failed to create job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = JOB_CATEGORIES.find((c) => c.value === form.category);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Job Posting</h1>
        <p className="text-gray-600">Post a new job opportunity across multiple industries</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Job Created Successfully!</h3>
            <p className="text-sm text-green-700">The job posting has been added to the system.</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* AI Parser Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">AI-Powered Job Parser</h3>
              <p className="text-sm text-gray-600 mb-4">
                Paste a job description and let AI extract the details automatically
              </p>
              <textarea
                className="w-full border border-gray-300 p-4 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                placeholder="Paste job description here..."
                rows={4}
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
              />
              <button
                type="button"
                onClick={parseJobDescription}
                disabled={parseLoading || !jobText.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {parseLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Parsing...
                  </span>
                ) : (
                  "✨ Parse with AI"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submitJob} className="p-8 space-y-8">
          {/* Basic Info */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📝</span> Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  placeholder="e.g., Senior Software Engineer"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="location"
                    placeholder="e.g., Tel Aviv"
                    value={form.location}
                    onChange={handleChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {JOB_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Job Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  placeholder="Detailed job description..."
                  rows={6}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  required
                />
              </div>
            </div>
          </section>

          {/* Job Type */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🏷️</span> Job Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Employment Type</label>
                <select
                  name="employment_type"
                  value={form.employment_type}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Experience Level</label>
                <select
                  name="experience_level"
                  value={form.experience_level}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Salary */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>💰</span> Salary Range
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Minimum (₪)</label>
                <input
                  type="number"
                  name="salary_min"
                  placeholder="15000"
                  value={form.salary_min}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Maximum (₪)</label>
                <input
                  type="number"
                  name="salary_max"
                  placeholder="25000"
                  value={form.salary_max}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </section>

          {/* Requirements */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>✅</span> Requirements
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Required Skills</label>
                <input
                  name="requirements"
                  placeholder="Python, React, 3 years experience (comma-separated)"
                  value={form.requirements}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Nice-to-Have</label>
                <input
                  name="advantages"
                  placeholder="Docker, AWS (comma-separated)"
                  value={form.advantages}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Required Languages</label>
                <input
                  name="required_languages"
                  placeholder="Hebrew, English (comma-separated)"
                  value={form.required_languages}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </section>

          {/* Industry Specific */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>{selectedCategory?.icon}</span> Industry-Specific
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Required Certifications</label>
                <input
                  name="certifications_required"
                  placeholder="Driving License, First Aid (comma-separated)"
                  value={form.certifications_required}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Physical Requirements</label>
                <input
                  name="physical_requirements"
                  placeholder="Able to lift 25kg, Standing for long periods"
                  value={form.physical_requirements}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-medium mb-3 text-gray-700">Work Schedule</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="shift_work"
                      checked={form.shift_work}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">🌙 Requires Shift Work</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="weekend_work"
                      checked={form.weekend_work}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">📅 Requires Weekend Work</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Benefits</label>
                <input
                  name="benefits"
                  placeholder="Health insurance, Meal vouchers (comma-separated)"
                  value={form.benefits}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Job...
                </span>
              ) : (
                "🚀 Create Job Posting"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}