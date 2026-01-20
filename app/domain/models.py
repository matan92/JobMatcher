from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================================
# New: Job Categories & Types
# ============================================================================

class JobCategory(str, Enum):
    """Main job categories"""
    TECHNOLOGY = "Technology"
    HEALTHCARE = "Healthcare"
    RETAIL = "Retail"
    HOSPITALITY = "Hospitality"
    MANUFACTURING = "Manufacturing"
    EDUCATION = "Education"
    FINANCE = "Finance"
    CONSTRUCTION = "Construction"
    LOGISTICS = "Logistics"
    CUSTOMER_SERVICE = "Customer Service"
    SALES = "Sales"
    ADMINISTRATION = "Administration"
    OTHER = "Other"


class ExperienceLevel(str, Enum):
    """Experience levels"""
    ENTRY_LEVEL = "Entry Level"
    JUNIOR = "Junior"
    MID_LEVEL = "Mid Level"
    SENIOR = "Senior"
    EXECUTIVE = "Executive"
    NO_EXPERIENCE = "No Experience Required"


class EmploymentType(str, Enum):
    """Employment types"""
    FULL_TIME = "Full Time"
    PART_TIME = "Part Time"
    CONTRACT = "Contract"
    TEMPORARY = "Temporary"
    INTERNSHIP = "Internship"
    FREELANCE = "Freelance"


# ============================================================================
# Updated Job Model
# ============================================================================

class JobCreate(BaseModel):
    title: str
    location: str
    description: str

    # NEW: Job classification
    category: JobCategory = JobCategory.OTHER
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    experience_level: ExperienceLevel = ExperienceLevel.MID_LEVEL

    # Salary
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None

    # Requirements (flexible for both tech and non-tech)
    requirements: List[str] = Field(default_factory=list)  # Hard requirements
    advantages: List[str] = Field(default_factory=list)  # Nice-to-have
    required_languages: List[str] = Field(default_factory=list)

    # NEW: Additional fields for general jobs
    physical_requirements: Optional[str] = None  # e.g., "Able to lift 25kg", "Standing for long periods"
    certifications_required: List[str] = Field(
        default_factory=list)  # e.g., "Food Handler Certificate", "Forklift License"
    shift_work: bool = False  # Does job require shift work?
    weekend_work: bool = False  # Does job require weekend work?

    # Benefits
    benefits: List[str] = Field(default_factory=list)  # e.g., "Health insurance", "Meal vouchers"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    category: Optional[JobCategory] = None
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[ExperienceLevel] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    requirements: Optional[List[str]] = None
    advantages: Optional[List[str]] = None
    required_languages: Optional[List[str]] = None
    physical_requirements: Optional[str] = None
    certifications_required: Optional[List[str]] = None
    shift_work: Optional[bool] = None
    weekend_work: Optional[bool] = None
    benefits: Optional[List[str]] = None


class JobDB(JobCreate):
    id: str
    created_at: datetime
    updated_at: datetime


# ============================================================================
# Updated Candidate Model
# ============================================================================

class CandidateCreate(BaseModel):
    name: str
    location: str
    email: Optional[str] = None
    phone: Optional[str] = None
    year_of_birth: Optional[str] = None

    # Experience & Education
    education: str
    experience: List[str] = Field(default_factory=list)

    # NEW: Experience level
    years_of_experience: Optional[int] = None  # Total years
    experience_level: Optional[ExperienceLevel] = None

    # Skills & Languages
    skills: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)

    # NEW: Certifications for non-tech roles
    certifications: List[str] = Field(default_factory=list)  # e.g., "First Aid", "Driving License"

    # NEW: Work preferences
    willing_to_work_shifts: bool = False
    willing_to_work_weekends: bool = False
    preferred_employment_type: Optional[EmploymentType] = None

    # Salary
    salary_expectation: float

    # Resume
    resume_filename: Optional[str] = None
    resume_content_type: Optional[str] = None


class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    year_of_birth: Optional[str] = None
    education: Optional[str] = None
    experience: Optional[List[str]] = None
    years_of_experience: Optional[int] = None
    experience_level: Optional[ExperienceLevel] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    willing_to_work_shifts: Optional[bool] = None
    willing_to_work_weekends: Optional[bool] = None
    preferred_employment_type: Optional[EmploymentType] = None
    salary_expectation: Optional[float] = None
    salary_currency: Optional[str] = None


class CandidateDB(CandidateCreate):
    id: str
    created_at: datetime
    updated_at: datetime