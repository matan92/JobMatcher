import React, { useState } from "react";
import axios from "axios";

// ============================================================================
// Constants
// ============================================================================

const EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Temporary",
  "Internship",
  "Freelance",
  "No Preference",
];

const EXPERIENCE_LEVELS = [
  "No Experience",
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Executive",
];

// ============================================================================
// Main Component
// ============================================================================

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

  // NEW: Additional fields for multi-industry support
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Mid Level");
  const [certifications, setCertifications] = useState("");
  const [willingToWorkShifts, setWillingToWorkShifts] = useState(false);
  const [willingToWorkWeekends, setWillingToWorkWeekends] = useState(false);
  const [preferredEmploymentType, setPreferredEmploymentType] = useState("Full Time");

  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);

  // ============================================================================
  // Handle File Upload (Parse Resume)
  // ============================================================================

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setResumeFile(file);
    setParseLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:8000/parse-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res.data;

      // Populate form with parsed data
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

      alert("✅ Resume parsed successfully! Please review and complete the remaining fields.");
    } catch (err) {
      console.error("Resume parse failed:", err);
      alert("⚠️ Failed to parse resume. Please fill the form manually.");
    } finally {
      setParseLoading(false);
    }
  };

  // ============================================================================
  // Handle Form Submission
  // ============================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resumeFile) {
      alert("⚠️ Please upload a resume before creating the candidate.");
      return;
    }

    if (!name || !location) {
      alert("⚠️ Please fill in required fields: Name and Location");
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

      // NEW: Multi-industry fields
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

      alert("✅ Candidate created successfully!");

      // Reset form
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

      // Clear file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = "";

    } catch (err) {
      console.error("Create candidate failed:", err);
      alert("❌ Failed to create candidate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Create Candidate Profile
      </h1>

      {parseLoading && (
        <div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-3 rounded mb-4 text-center">
          <strong>🔄 Parsing resume...</strong> Please wait while we extract the information.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ================================================================= */}
        {/* Resume Upload */}
        {/* ================================================================= */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
          <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
            📄 Resume Upload
          </h3>

          <div>
            <label className="font-medium block mb-2">
              Upload Resume (PDF / DOCX / TXT) <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="block w-full border border-gray-300 p-3 rounded-lg cursor-pointer hover:border-blue-400 transition-colors"
              required
            />
            <p className="text-sm text-gray-600 mt-2">
              💡 <strong>Tip:</strong> Upload your resume first for automatic data extraction
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Basic Information */}
        {/* ================================================================= */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b-2 pb-2">
            👤 Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium block mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Tel Aviv"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Email</label>
              <input
                type="email"
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Phone</label>
              <input
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+972-XX-XXX-XXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Year of Birth</label>
              <input
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1990"
                value={yearOfBirth}
                onChange={(e) => setYearOfBirth(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Experience & Education */}
        {/* ================================================================= */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b-2 pb-2">
            💼 Experience & Education
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium block mb-1">
                  Years of Experience
                </label>
                <input
                  type="number"
                  className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 5"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  min="0"
                  max="50"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">
                  Experience Level
                </label>
                <select
                  className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium block mb-1">Education</label>
              <textarea
                className="border border-gray-300 p-3 rounded-lg w-full h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., B.Sc. Computer Science, Tel Aviv University"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Work Experience (one per line)
              </label>
              <textarea
                className="border border-gray-300 p-3 rounded-lg w-full h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g.,
Software Engineer at Google (2020-2023)
Junior Developer at Microsoft (2018-2020)"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Skills & Languages */}
        {/* ================================================================= */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b-2 pb-2">
            🛠️ Skills & Languages
          </h3>

          <div className="space-y-4">
            <div>
              <label className="font-medium block mb-1">
                Skills (one per line)
              </label>
              <textarea
                className="border border-gray-300 p-3 rounded-lg w-full h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g.,
Python
React
MongoDB"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Languages (one per line)
              </label>
              <textarea
                className="border border-gray-300 p-3 rounded-lg w-full h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g.,
Hebrew - Native
English - Fluent"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Certifications & Licenses */}
        {/* ================================================================= */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b-2 pb-2">
            📜 Certifications & Licenses
          </h3>

          <div>
            <label className="font-medium block mb-1">
              Certifications & Licenses (one per line)
            </label>
            <textarea
              className="border border-gray-300 p-3 rounded-lg w-full h-24 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g.,
Driving License B
First Aid Certificate
AWS Certified Developer"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              💡 Important for healthcare, logistics, and other licensed professions
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Work Preferences */}
        {/* ================================================================= */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b-2 pb-2">
            ⚙️ Work Preferences
          </h3>

          <div className="space-y-4">
            <div>
              <label className="font-medium block mb-1">
                Preferred Employment Type
              </label>
              <select
                className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={preferredEmploymentType}
                onChange={(e) => setPreferredEmploymentType(e.target.value)}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="font-medium mb-3">Schedule Availability</p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={willingToWorkShifts}
                    onChange={(e) => setWillingToWorkShifts(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium">🌙 Willing to Work Shifts</span>
                    <p className="text-sm text-gray-600">
                      (Evening, night, or rotating shifts)
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={willingToWorkWeekends}
                    onChange={(e) => setWillingToWorkWeekends(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium">📅 Willing to Work Weekends</span>
                    <p className="text-sm text-gray-600">
                      (Saturdays, Sundays, and holidays)
                    </p>
                  </div>
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                ⚠️ <strong>Important:</strong> Jobs requiring these will filter you out if unchecked
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Salary Expectations */}
        {/* ================================================================= */}
        <section>
          <h3 className="text-xl font-semibold mb-4 border-b-2 pb-2">
            💰 Salary Expectations
          </h3>

          <div>
            <label className="font-medium block mb-1">
              Expected Salary (₪) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="border border-gray-300 p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 15000"
              value={salaryExpectation}
              onChange={(e) => setSalaryExpectation(e.target.value)}
              required
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Submit Button */}
        {/* ================================================================= */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {loading ? "🔄 Creating Candidate..." : "✅ Create Candidate Profile"}
          </button>
        </div>

      </form>
    </div>
  );
}