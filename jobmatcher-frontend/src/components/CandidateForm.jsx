import React, { useState } from "react";
import axios from "axios";

const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Contract", "Temporary", "Internship", "Freelance", "No Preference"];
const EXPERIENCE_LEVELS = ["No Experience", "Entry Level", "Junior", "Mid Level", "Senior", "Executive"];

export default function CandidateForm() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [education, setEducation] = useState("");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [experience, setExperience] = useState("");
  const [languages, setLanguages] = useState("");
  const [skills, setSkills] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level");
  const [certifications, setCertifications] = useState("");
  const [willingToWorkShifts, setWillingToWorkShifts] = useState(false);
  const [willingToWorkWeekends, setWillingToWorkWeekends] = useState(false);
  const [preferredEmploymentType, setPreferredEmploymentType] = useState("Full Time");
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setResumeFile(file);
    setParseLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:8000/parse-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res.data;
      setName(parsed.name || "");
      setLocation(parsed.location || "");
      setEmail(parsed.email || "");
      setPhone(parsed.phone || "");
      setYearOfBirth(parsed.year_of_birth || "");
      setSalaryExpectation(parsed.salary_expectation || "");
      setEducation(parsed.education || "");
      setExperience((parsed.experience || []).join("\n"));
      setLanguages((parsed.languages || []).join("\n"));
      setSkills((parsed.skills || []).join("\n"));
    } catch (err) {
      setError("Failed to parse resume. Please fill the form manually.");
    } finally {
      setParseLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!resumeFile) {
      setError("Please upload a resume");
      return;
    }

    if (!name || !location) {
      setError("Please fill in Name and Location");
      return;
    }

    const payload = {
      name,
      location,
      email: email || null,
      phone: phone || null,
      year_of_birth: yearOfBirth || null,
      education,
      salary_expectation: salaryExpectation ? parseFloat(salaryExpectation) : 0,
      experience: experience.split("\n").filter(Boolean),
      languages: languages.split("\n").filter(Boolean),
      skills: skills.split("\n").filter(Boolean),
      years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
      experience_level: experienceLevel,
      certifications: certifications.split("\n").filter(Boolean),
      willing_to_work_shifts: willingToWorkShifts,
      willing_to_work_weekends: willingToWorkWeekends,
      preferred_employment_type: preferredEmploymentType !== "No Preference" ? preferredEmploymentType : null,
    };

    const formData = new FormData();
    formData.append("file", resumeFile);
    formData.append("payload", JSON.stringify(payload));

    setLoading(true);

    try {
      await axios.post("http://localhost:8000/candidates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Reset
      setName("");
      setLocation("");
      setEmail("");
      setPhone("");
      setYearOfBirth("");
      setEducation("");
      setSalaryExpectation("");
      setExperience("");
      setLanguages("");
      setSkills("");
      setYearsOfExperience("");
      setExperienceLevel("Mid Level");
      setCertifications("");
      setWillingToWorkShifts(false);
      setWillingToWorkWeekends(false);
      setPreferredEmploymentType("Full Time");
      setResumeFile(null);

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError("Failed to create candidate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Candidate Profile</h1>
        <p className="text-gray-600">Add a new candidate to the recruitment system</p>
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
            <h3 className="font-semibold text-green-900">Candidate Created Successfully!</h3>
            <p className="text-sm text-green-700">The candidate profile has been added to the system.</p>
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

      {/* Parse Loading */}
      {parseLoading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-blue-800 font-medium">Parsing resume... Please wait.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Resume Upload */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-2xl">📄</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Resume Upload</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload your resume for automatic data extraction (PDF, DOCX, or TXT)
              </p>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white hover:file:from-purple-700 hover:file:to-pink-700 file:cursor-pointer file:transition-all file:shadow-md"
                required
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Basic Info */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>👤</span> Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  placeholder="Tel Aviv"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Phone</label>
                <input
                  placeholder="+972-XX-XXX-XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Year of Birth</label>
                <input
                  placeholder="1990"
                  value={yearOfBirth}
                  onChange={(e) => setYearOfBirth(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </section>

          {/* Experience */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>💼</span> Experience & Education
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    placeholder="5"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Experience Level</label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    {EXPERIENCE_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Education</label>
                <textarea
                  placeholder="B.Sc. Computer Science, Tel Aviv University"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Work Experience (one per line)</label>
                <textarea
                  placeholder="Software Engineer at Google (2020-2023)
Junior Developer at Microsoft (2018-2020)"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={4}
                />
              </div>
            </div>
          </section>

          {/* Skills */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>🛠️</span> Skills & Languages
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Skills (one per line)</label>
                <textarea
                  placeholder="Python
React
MongoDB"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-2">Languages (one per line)</label>
                <textarea
                  placeholder="Hebrew - Native
English - Fluent"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  rows={3}
                />
              </div>
            </div>
          </section>

          {/* Certifications */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📜</span> Certifications & Licenses
            </h2>
            <div>
              <label className="block font-medium text-gray-700 mb-2">Certifications (one per line)</label>
              <textarea
                placeholder="Driving License B
First Aid Certificate
AWS Certified Developer"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                rows={3}
              />
            </div>
          </section>

          {/* Work Preferences */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>⚙️</span> Work Preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-gray-700 mb-2">Preferred Employment Type</label>
                <select
                  value={preferredEmploymentType}
                  onChange={(e) => setPreferredEmploymentType(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-medium mb-3 text-gray-700">Schedule Availability</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={willingToWorkShifts}
                      onChange={(e) => setWillingToWorkShifts(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-gray-700">🌙 Willing to Work Shifts</span>
                      <p className="text-sm text-gray-500">Evening, night, or rotating shifts</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={willingToWorkWeekends}
                      onChange={(e) => setWillingToWorkWeekends(e.target.checked)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 mt-0.5"
                    />
                    <div>
                      <span className="font-medium text-gray-700">📅 Willing to Work Weekends</span>
                      <p className="text-sm text-gray-500">Saturdays, Sundays, and holidays</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Salary */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>💰</span> Salary Expectations
            </h2>
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Expected Salary (₪) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="15000"
                value={salaryExpectation}
                onChange={(e) => setSalaryExpectation(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
            </div>
          </section>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Profile...
                </span>
              ) : (
                "✅ Create Candidate Profile"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}