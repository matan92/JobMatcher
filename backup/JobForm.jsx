import React, { useState } from "react";

// ============================================================================
// Constants
// ============================================================================

const JOB_CATEGORIES = [
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

const EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
];

const EXPERIENCE_LEVELS = [
  "No Experience Required",
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Executive",
];

// ============================================================================
// Main Component
// ============================================================================

export default function JobForm() {
  const [loading, setLoading] = useState(false);
  const [jobText, setJobText] = useState("");

  const [form, setForm] = useState({
    // Basic Info
    title: "",
    location: "",
    description: "",

    // Category & Type
    category: "Technology",
    employment_type: "Full Time",
    experience_level: "Mid Level",

    // Salary
    salary_min: "",
    salary_max: "",

    // Requirements
    requirements: "",
    advantages: "",
    required_languages: "",

    // NEW: Industry-specific
    certifications_required: "",
    physical_requirements: "",
    shift_work: false,
    weekend_work: false,

    // Benefits
    benefits: "",
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const parseJobDescription = async () => {
    if (!jobText.trim()) {
      alert("Please enter a job description to parse");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: jobText }),
      });

      if (!res.ok) {
        throw new Error("Failed to parse job description");
      }

      const data = await res.json();

      // Map parsed data to form
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

      alert("Job description parsed successfully! Review and adjust as needed.");
    } catch (err) {
      console.error("Job parsing failed:", err);
      alert("Failed to parse job description. Please fill manually.");
    } finally {
      setLoading(false);
    }
  };

  const submitJob = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!form.title || !form.location || !form.description) {
      alert("Please fill in all required fields (Title, Location, Description)");
      return;
    }

    const payload = {
      title: form.title,
      location: form.location,
      description: form.description,

      // Category & Type
      category: form.category,
      employment_type: form.employment_type,
      experience_level: form.experience_level,

      // Salary
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,

      // Requirements (convert comma-separated to arrays)
      requirements: form.requirements.split(",").map((s) => s.trim()).filter(Boolean),
      advantages: form.advantages.split(",").map((s) => s.trim()).filter(Boolean),
      required_languages: form.required_languages.split(",").map((l) => l.trim()).filter(Boolean),

      // Industry-specific
      certifications_required: form.certifications_required.split(",").map((c) => c.trim()).filter(Boolean),
      physical_requirements: form.physical_requirements || null,
      shift_work: form.shift_work,
      weekend_work: form.weekend_work,

      // Benefits
      benefits: form.benefits.split(",").map((b) => b.trim()).filter(Boolean),
    };

    try {
      const res = await fetch("http://localhost:8000/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to create job");
      }

      alert("Job created successfully!");

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
    } catch (err) {
      console.error("Create job failed:", err);
      alert("Failed to create job. Please try again.");
    }
  };

  // Get selected category icon
  const selectedCategory = JOB_CATEGORIES.find(c => c.value === form.category);

  return (
    <div className="bg-white p-8 rounded-xl shadow max-w-4xl w-full">
      <h2 className="text-3xl font-bold mb-6 text-center">
        Create Job Posting
      </h2>

      {/* ================================================================= */}
      {/* AI Job Description Parser */}
      {/* ================================================================= */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-lg mb-2">
          🤖 AI-Powered Job Parser
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Paste a job description below and let AI extract the details automatically
        </p>

        <textarea
          className="w-full border border-gray-300 p-3 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Paste job description here (from LinkedIn, job boards, etc.)..."
          rows={6}
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
        />

        <button
          type="button"
          onClick={parseJobDescription}
          disabled={loading || !jobText.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors w-full font-medium"
        >
          {loading ? "🔄 Parsing..." : "✨ Parse with AI"}
        </button>
      </div>

      {/* ================================================================= */}
      {/* Job Form */}
      {/* ================================================================= */}
      <form onSubmit={submitJob} className="space-y-6">

        {/* Basic Information */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">
            📝 Basic Information
          </h3>

          <div className="space-y-4">
            <div>
              <label className="font-medium block mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                name="title"
                placeholder="e.g., Software Engineer, Registered Nurse, Store Manager"
                value={form.title}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                name="location"
                placeholder="e.g., Tel Aviv, Haifa, Remote"
                value={form.location}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                placeholder="Detailed job description, responsibilities, company info..."
                rows={6}
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </section>

        {/* Job Classification */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">
            🏷️ Job Classification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-medium block mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {JOB_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium block mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium block mb-1">
                Experience Level <span className="text-red-500">*</span>
              </label>
              <select
                name="experience_level"
                value={form.experience_level}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Salary */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">
            💰 Salary Range
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-medium block mb-1">Minimum Salary</label>
              <input
                type="number"
                name="salary_min"
                placeholder="e.g., 15000"
                value={form.salary_min}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Maximum Salary</label>
              <input
                type="number"
                name="salary_max"
                placeholder="e.g., 25000"
                value={form.salary_max}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Currency</label>
              <select
                name="salary_currency"
                value={form.salary_currency}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ILS">₪ ILS</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>
        </section>

        {/* Requirements & Skills */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">
            ✅ Requirements & Skills
          </h3>

          <div className="space-y-4">
            <div>
              <label className="font-medium block mb-1">
                Required Skills/Experience
              </label>
              <input
                name="requirements"
                placeholder="e.g., Python, React, 3 years experience (comma-separated)"
                value={form.requirements}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Must-have requirements (hard filters)
              </p>
            </div>

            <div>
              <label className="font-medium block mb-1">
                Nice-to-Have (Advantages)
              </label>
              <input
                name="advantages"
                placeholder="e.g., Docker, AWS, Team leadership (comma-separated)"
                value={form.advantages}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Bonus skills that improve match score
              </p>
            </div>

            <div>
              <label className="font-medium block mb-1">
                Required Languages
              </label>
              <input
                name="required_languages"
                placeholder="e.g., Hebrew, English (comma-separated)"
                value={form.required_languages}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Industry-Specific Requirements */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">
            {selectedCategory?.icon} Industry-Specific Requirements
          </h3>

          <div className="space-y-4">
            <div>
              <label className="font-medium block mb-1">
                Required Certifications/Licenses
              </label>
              <input
                name="certifications_required"
                placeholder="e.g., RN License, First Aid, Forklift License (comma-separated)"
                value={form.certifications_required}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty if no certifications required
              </p>
            </div>

            <div>
              <label className="font-medium block mb-1">
                Physical Requirements
              </label>
              <input
                name="physical_requirements"
                placeholder="e.g., Able to lift 25kg, Standing for long periods"
                value={form.physical_requirements}
                onChange={handleChange}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-3">Work Schedule Requirements</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="shift_work"
                    checked={form.shift_work}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span>🌙 Requires Shift Work</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="weekend_work"
                    checked={form.weekend_work}
                    onChange={handleChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span>📅 Requires Weekend Work</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Candidates unwilling to work these shifts will be filtered out
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b pb-2">
            🎁 Benefits & Perks
          </h3>

          <div>
            <label className="font-medium block mb-1">
              Employee Benefits
            </label>
            <input
              name="benefits"
              placeholder="e.g., Health insurance, Meal vouchers, Gym membership (comma-separated)"
              value={form.benefits}
              onChange={handleChange}
              className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </section>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-green-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
          >
            🚀 Create Job Posting
          </button>
        </div>
      </form>
    </div>
  );
}