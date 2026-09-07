/**
 * Curated Course & Skill Library View
 *
 * Adheres strictly to the AI Career Guidance Design System (v6):
 * - Page title: 40px, bold (700), #000000
 * - Card titles: 22px, bold (700), #000000
 * - Body: 16px, regular (400)
 * - Secondary text: #615d59
 * - Background: #f6f5f4
 * - Card background: #ffffff, 1px solid #e6e6e6, 8px border radius, 24px padding, zero shadows
 * - Start Course CTA: #0075de pill (rounded-full)
 * - Topic tags: 1px solid #e6e6e6, 4px radius, transparent/subtle background
 * - Paid courses: "Free/public alternative available" in #615d59
 */

import { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Bookmark,
  ArrowRight,
  ExternalLink,
  Clock,
  BookOpen,
  Award,
  X,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  provider: string;
  providerType: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  costType: 'Free' | 'Free Audit Available' | 'Paid ($99)' | 'Free Certificate';
  isPaid?: boolean;
  category: string;
  tags: string[];
  imageUrl: string;
  ctaText: string;
  externalUrl: string;
  syllabusTopics?: string[];
}

const COURSES_DATA: Course[] = [
  {
    id: 'course-stanford-python',
    title: 'Introduction to Python for Data Science',
    description:
      'Master Python fundamentals, data manipulation with pandas, and exploratory data analysis through real-world dataset exercises.',
    provider: 'STANFORD ONLINE',
    providerType: 'University Course',
    duration: '8 Weeks (4-6 hrs/wk)',
    level: 'Beginner',
    costType: 'Free',
    isPaid: false,
    category: 'Data Science & Analytics',
    tags: ['Python', 'Data Analysis', 'Pandas', 'Jupyter'],
    imageUrl:
      'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Start Course',
    externalUrl: 'https://online.stanford.edu',
    syllabusTopics: [
      'Python syntax, loops, and control flow',
      'Data wrangling with Pandas and NumPy',
      'Data visualization using Matplotlib & Seaborn',
      'Exploratory data analysis on real datasets',
    ],
  },
  {
    id: 'course-google-ux',
    title: 'Foundations of User Experience (UX) Design',
    description:
      'Understand the basics of UX design, including user research, wireframing, usability testing, and accessible prototyping in Figma.',
    provider: 'GOOGLE CAREER CERTIFICATES',
    providerType: 'Industry Credential',
    duration: '4 Weeks (5 hrs/wk)',
    level: 'Beginner',
    costType: 'Free Audit Available',
    isPaid: false,
    category: 'Design & UX',
    tags: ['UX Research', 'Figma', 'Wireframing', 'Usability Testing'],
    imageUrl:
      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Start Course',
    externalUrl: 'https://grow.google/certificates/ux-design',
    syllabusTopics: [
      'Foundational concepts of user-centric design',
      'Conducting user research and empathy maps',
      'Wireframing and low-fidelity prototyping in Figma',
      'Planning and running usability studies',
    ],
  },
  {
    id: 'course-mit-cs',
    title: 'Introduction to Computer Science and Programming',
    description:
      'A comprehensive introduction to computational problem solving using Python, covering algorithms, data structures, and algorithmic complexity.',
    provider: 'MIT OPENCOURSEWARE',
    providerType: 'University OpenCourseWare',
    duration: '9 Weeks (6-8 hrs/wk)',
    level: 'Intermediate',
    costType: 'Free',
    isPaid: false,
    category: 'Technology & Software',
    tags: ['Algorithms', 'Python', 'Data Structures', 'Recursion'],
    imageUrl:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Start Course',
    externalUrl: 'https://ocw.mit.edu',
    syllabusTopics: [
      'Computational thinking and problem abstraction',
      'Branching, iteration, and recursion fundamentals',
      'Testing, debugging, and exception handling',
      'Algorithmic complexity (Big O notation)',
    ],
  },
  {
    id: 'course-aws-cloud',
    title: 'AWS Certified Cloud Practitioner Essentials',
    description:
      'Gain an overall understanding of the AWS Cloud platform, security, architecture, pricing, and foundational cloud infrastructure services.',
    provider: 'AWS TRAINING & CERTIFICATION',
    providerType: 'Vendor Certification',
    duration: '6 Hours (Self-paced)',
    level: 'Intermediate',
    costType: 'Paid ($99)',
    isPaid: true,
    category: 'Cloud & DevOps',
    tags: ['Cloud Computing', 'AWS', 'Cloud Security', 'DevOps'],
    imageUrl:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    ctaText: 'View Details',
    externalUrl: 'https://aws.amazon.com/certification/certified-cloud-practitioner',
    syllabusTopics: [
      'Cloud concepts and the AWS global infrastructure',
      'Core AWS services (Compute, Storage, Networking, Database)',
      'Security and the AWS Shared Responsibility Model',
      'Cloud billing, support plans, and pricing calculators',
    ],
  },
  {
    id: 'course-harvard-cs50',
    title: 'CS50: Introduction to Computer Science',
    description:
      'An introduction to the intellectual enterprises of computer science and the art of programming for majors and non-majors alike.',
    provider: 'HARVARD UNIVERSITY (EDX)',
    providerType: 'University Course',
    duration: '12 Weeks (6-18 hrs/wk)',
    level: 'Beginner',
    costType: 'Free',
    isPaid: false,
    category: 'Technology & Software',
    tags: ['C', 'Python', 'SQL', 'Web Development'],
    imageUrl:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Start Course',
    externalUrl: 'https://cs50.harvard.edu/x',
    syllabusTopics: [
      'Memory management and pointers in C',
      'Data structures: linked lists, trees, hash tables',
      'Databases and relational queries in SQL',
      'Web application development with HTML, CSS, JavaScript, and Flask',
    ],
  },
  {
    id: 'course-ibm-genai',
    title: 'Generative AI Foundations for Everyone',
    description:
      'Learn the core concepts of generative AI, large language models, prompt engineering, and real-world ethical considerations and governance.',
    provider: 'IBM SKILLSBUILD',
    providerType: 'Industry Credential',
    duration: '5 Hours (Modular)',
    level: 'Beginner',
    costType: 'Free Certificate',
    isPaid: false,
    category: 'Artificial Intelligence',
    tags: ['Generative AI', 'Prompt Engineering', 'LLMs', 'Ethics'],
    imageUrl:
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Start Course',
    externalUrl: 'https://skillsbuild.org',
    syllabusTopics: [
      'Generative AI foundations and how LLMs work',
      'Techniques for effective prompt engineering',
      'Generative AI tooling for workplace productivity',
      'Ethical guardrails, bias mitigation, and safety',
    ],
  },
];

const CATEGORIES = [
  'All Courses',
  'Technology & Software',
  'Data Science & Analytics',
  'Design & UX',
  'Cloud & DevOps',
  'Artificial Intelligence',
];

export function CoursesView(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Courses');
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'Beginner' | 'Intermediate'>('All');
  const [sortBy, setSortBy] = useState<'recommended' | 'duration' | 'title'>('recommended');
  const [savedCourseIds, setSavedCourseIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('nextpath_saved_courses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeCourseModal, setActiveCourseModal] = useState<Course | null>(null);

  const toggleBookmark = (courseId: string) => {
    setSavedCourseIds((prev) => {
      const next = prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId];
      try {
        localStorage.setItem('nextpath_saved_courses', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredCourses = useMemo(() => {
    return COURSES_DATA.filter((course) => {
      // Category filter
      if (selectedCategory !== 'All Courses' && course.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'All' && course.level !== selectedLevel) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(query);
        const matchesDesc = course.description.toLowerCase().includes(query);
        const matchesProvider = course.provider.toLowerCase().includes(query);
        const matchesTags = course.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDesc && !matchesProvider && !matchesTags) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'duration') {
        return a.duration.localeCompare(b.duration);
      }
      return 0; // Default recommended order
    });
  }, [searchQuery, selectedCategory, selectedLevel, sortBy]);

  return (
    <div className="w-full bg-[#f6f5f4] -mx-md -my-lg px-md py-lg md:-mx-lg md:px-lg min-h-screen text-[#000000]">
      <div className="mx-auto max-w-6xl pb-24">
        {/* Breadcrumb Eyebrow */}
        <div className="flex items-center gap-2 mb-2 pt-2">
          <span className="w-2 h-2 rounded-full bg-[#0075de] inline-block" />
          <span className="text-[12px] font-[600] uppercase tracking-wider text-[#615d59]">
            COURSES & SKILLS
          </span>
        </div>

        {/* Page Title: 40px / 700 / #000000 */}
        <h1 className="text-[40px] font-[700] text-[#000000] tracking-tight leading-[1.1] mb-3">
          Curated Course & Skill Library
        </h1>

        {/* Subtitle / Description: 16px / 400 / #615d59 */}
        <p className="text-[16px] font-[400] text-[#615d59] leading-relaxed max-w-3xl mb-8">
          Discover industry-relevant courses, hands-on labs, and verified certifications designed to
          build in-demand skills for your future pathway.
        </p>

        {/* Search Bar & Filter Toggle */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#615d59] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, skills, or institutions..."
              className="w-full h-12 bg-[#ffffff] border border-[#e6e6e6] rounded-[8px] pl-10 pr-4 text-[16px] text-[#000000] placeholder:text-[#615d59]/70 focus:outline-none focus:ring-2 focus:ring-[#0075de] focus:border-transparent transition-all shadow-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#615d59] hover:text-[#000000]"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Toggle filters"
            className="h-12 px-4 bg-[#ffffff] border border-[#e6e6e6] rounded-[8px] flex items-center justify-center text-[#615d59] hover:text-[#000000] hover:border-[#0075de] transition-colors"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 text-[14px] font-[500] rounded-full transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#0075de] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#615d59] border border-[#e6e6e6] hover:text-[#000000]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Status / Sort / Level Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#e6e6e6]">
          <div className="flex items-center gap-4 text-[14px] text-[#615d59]">
            <span>
              Showing <strong className="text-[#000000] font-[600]">{filteredCourses.length}</strong> courses
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-[#615d59]">
              <CheckCircle2 size={15} className="text-[#0075de]" />
              Verified syllabus
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Level Filter Dropdown */}
            <div className="relative">
              <select
                aria-label="Filter by level"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as any)}
                className="h-9 px-3 pr-7 bg-[#ffffff] border border-[#e6e6e6] rounded-[6px] text-[13px] font-[500] text-[#615d59] hover:text-[#000000] focus:outline-none focus:ring-1 focus:ring-[#0075de] cursor-pointer appearance-none shadow-none"
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Level: Beginner</option>
                <option value="Intermediate">Level: Intermediate</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#615d59]">
                ▼
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                aria-label="Sort courses"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-3 pr-7 bg-[#ffffff] border border-[#e6e6e6] rounded-[6px] text-[13px] font-[500] text-[#615d59] hover:text-[#000000] focus:outline-none focus:ring-1 focus:ring-[#0075de] cursor-pointer appearance-none shadow-none"
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="duration">Sort: Duration</option>
                <option value="title">Sort: Course Title</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#615d59]">
                ▼
              </span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="bg-[#ffffff] border border-[#e6e6e6] rounded-[8px] p-12 text-center my-8 shadow-none">
            <BookOpen size={40} className="mx-auto text-[#615d59] mb-3 opacity-60" />
            <h3 className="text-[20px] font-[700] text-[#000000] mb-2">No matching courses found</h3>
            <p className="text-[16px] text-[#615d59] max-w-md mx-auto mb-6">
              Try adjusting your search terms or clearing the selected category filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All Courses');
                setSelectedLevel('All');
              }}
              className="bg-[#0075de] text-[#ffffff] px-6 py-2.5 rounded-full text-[15px] font-[500] hover:bg-[#005bab] transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isSaved = savedCourseIds.includes(course.id);

            return (
              <article
                key={course.id}
                className="bg-[#ffffff] border border-[#e6e6e6] rounded-[8px] p-[24px] shadow-none flex flex-col justify-between transition-all duration-150 hover:border-[#0075de]/60"
              >
                <div>
                  {/* Top Image Banner */}
                  <div className="relative mb-5 overflow-hidden rounded-[6px] bg-[#f6f5f4] border border-[#e6e6e6] aspect-[16/9]">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback placeholder if image fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Duration Chip on Image */}
                    <div className="absolute bottom-2 left-2 bg-[#000000]/80 backdrop-blur-xs text-[#ffffff] px-2.5 py-1 rounded-[4px] text-[12px] font-[500] flex items-center gap-1.5">
                      <Clock size={12} className="text-[#ffffff]" />
                      <span>{course.duration}</span>
                    </div>
                  </div>

                  {/* Provider & Badges line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-[12px] font-[700] uppercase tracking-wider text-[#615d59] flex items-center gap-1">
                      {course.provider}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-[500] px-2 py-0.5 rounded-[4px] bg-[#f6f5f4] border border-[#e6e6e6] text-[#615d59]">
                        {course.level}
                      </span>
                      <span
                        className={`text-[11px] font-[500] px-2 py-0.5 rounded-[4px] border ${
                          course.isPaid
                            ? 'bg-[#f6f5f4] border-[#e6e6e6] text-[#615d59]'
                            : 'bg-[#f6f5f4] border-[#e6e6e6] text-[#0075de]'
                        }`}
                      >
                        {course.costType}
                      </span>
                    </div>
                  </div>

                  {/* 1. Course Title: 22px / 700 / #000000 */}
                  <h2 className="text-[22px] font-[700] text-[#000000] tracking-tight leading-[1.25] mb-2.5">
                    {course.title}
                  </h2>

                  {/* 2. Description: 16px / 400 / #31302e */}
                  <p className="text-[16px] font-[400] text-[#31302e] leading-relaxed mb-4">
                    {course.description}
                  </p>

                  {/* 3. Provider / Duration / Secondary information (#615d59) */}
                  <div className="space-y-1.5 mb-5 text-[#615d59] text-[14px]">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#615d59] shrink-0" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-[#615d59] shrink-0" />
                      <span>Verified Provider: {course.provider}</span>
                    </div>

                    {/* Paid Course Information: Free/public alternative available */}
                    {course.isPaid && (
                      <div className="pt-1 text-[14px] font-[400] text-[#615d59] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#615d59] shrink-0" />
                        <span>Free/public alternative available</span>
                      </div>
                    )}
                  </div>

                  {/* 4. Topic Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {course.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 rounded-[4px] border border-[#e6e6e6] bg-transparent text-[13px] font-[400] text-[#615d59]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 5. Primary CTA */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#e6e6e6]">
                  <button
                    type="button"
                    onClick={() => setActiveCourseModal(course)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0075de] hover:bg-[#005bab] text-[#ffffff] font-[500] text-[16px] px-6 py-2.5 rounded-full transition-colors active:scale-[0.98] shadow-none"
                  >
                    <span>{course.ctaText}</span>
                    {course.isPaid ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleBookmark(course.id)}
                    aria-label={isSaved ? 'Remove from saved courses' : 'Save course'}
                    className={`h-11 w-11 rounded-full border border-[#e6e6e6] flex items-center justify-center transition-colors ${
                      isSaved
                        ? 'bg-[#f6f5f4] text-[#0075de] border-[#0075de]/40'
                        : 'bg-[#ffffff] text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4]'
                    }`}
                  >
                    <Bookmark size={18} className={isSaved ? 'fill-[#0075de]' : ''} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Course Detail Modal (Preserves click/navigation and course syllabus) */}
      {activeCourseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-course-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-xl bg-[#ffffff] border border-[#e6e6e6] rounded-[8px] p-6 max-h-[90vh] overflow-y-auto shadow-none">
            <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-[#e6e6e6]">
              <div>
                <span className="text-[12px] font-[700] uppercase tracking-wider text-[#615d59]">
                  {activeCourseModal.provider}
                </span>
                <h2 id="modal-course-title" className="text-[22px] font-[700] text-[#000000] mt-1">
                  {activeCourseModal.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourseModal(null)}
                aria-label="Close modal"
                className="p-1.5 text-[#615d59] hover:text-[#000000] rounded-full hover:bg-[#f6f5f4]"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-[16px] text-[#31302e] leading-relaxed mb-5">
              {activeCourseModal.description}
            </p>

            <div className="bg-[#f6f5f4] border border-[#e6e6e6] rounded-[6px] p-4 mb-5 space-y-2 text-[14px] text-[#615d59]">
              <div className="flex justify-between">
                <span className="text-[#615d59]">Duration:</span>
                <span className="font-[600] text-[#000000]">{activeCourseModal.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#615d59]">Skill Level:</span>
                <span className="font-[600] text-[#000000]">{activeCourseModal.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#615d59]">Cost Tier:</span>
                <span className="font-[600] text-[#000000]">{activeCourseModal.costType}</span>
              </div>
              {activeCourseModal.isPaid && (
                <div className="pt-2 border-t border-[#e6e6e6] text-[#615d59]">
                  💡 <strong>Free/public alternative available</strong> through NPTEL/SWAYAM and university open courseware.
                </div>
              )}
            </div>

            {activeCourseModal.syllabusTopics && (
              <div className="mb-6">
                <h3 className="text-[16px] font-[700] text-[#000000] mb-2.5">
                  Core Syllabus & Topics Covered
                </h3>
                <ul className="space-y-2 text-[14px] text-[#31302e]">
                  {activeCourseModal.syllabusTopics.map((topic) => (
                    <li key={topic} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-[#0075de] shrink-0 mt-0.5" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e6e6e6]">
              <button
                type="button"
                onClick={() => setActiveCourseModal(null)}
                className="px-5 py-2.5 text-[15px] font-[500] text-[#615d59] hover:text-[#000000]"
              >
                Close
              </button>
              <a
                href={activeCourseModal.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#0075de] hover:bg-[#005bab] text-[#ffffff] font-[500] text-[15px] px-6 py-2.5 rounded-full transition-colors"
              >
                <span>Continue on Provider Portal</span>
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
