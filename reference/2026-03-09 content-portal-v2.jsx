import { useState } from "react";

const BLOGS = [
  {
    id: 1,
    date: "Mar 9, 2026",
    practice: "Centerpoint Dental",
    hsid: "15490551454",
    title: "Dental Care in Yucaipa: Your Complete Guide to Healthy Smiles",
    keyword: "dental care yucaipa",
    features: ["hyperlocal", "reviews"],
    hyperlocal: {
      terms: ["Yucaipa Boulevard", "Chapman Heights", "Wildwood Canyon"],
      source: "HubSpot geo-terms list",
    },
    reviews: {
      quote:
        "Dr. Patel and the team made my first visit so comfortable. The office on Yucaipa Blvd is easy to find and the staff is incredibly welcoming.",
      reviewer: "Maria G.",
      rating: 5,
      date: "Feb 22, 2026",
    },
  },
  {
    id: 2,
    date: "Mar 9, 2026",
    practice: "Sunnymead Dental Group",
    hsid: "37964998929",
    title: "Family Dental Care in Moreno Valley: Complete Guide for Every Age",
    keyword: "family dental moreno valley",
    features: ["hyperlocal"],
    hyperlocal: {
      terms: ["Sunnymead Ranch", "TownGate", "Moreno Valley Mall area"],
      source: "HubSpot geo-terms list",
    },
    reviews: null,
  },
  {
    id: 3,
    date: "Mar 9, 2026",
    practice: "Highland Village Dental",
    hsid: "52706784401",
    title: "Dental Emergency Signs in Roseville: Know When to Seek Help",
    keyword: "dental emergency signs",
    features: ["reviews"],
    hyperlocal: null,
    reviews: {
      quote:
        "Had a cracked tooth on a Saturday and they got me in same day. Truly grateful for the emergency availability.",
      reviewer: "James T.",
      rating: 5,
      date: "Mar 1, 2026",
    },
  },
  {
    id: 4,
    date: "Mar 9, 2026",
    practice: "Cajon Dental",
    hsid: "32182754649",
    title: "Emergency Dental Care in Redlands: Fast Relief When You Need It",
    keyword: "emergency dental redlands",
    features: [],
    hyperlocal: null,
    reviews: null,
  },
  {
    id: 5,
    date: "Mar 8, 2026",
    practice: "Palm Desert Smiles",
    hsid: "44821093847",
    title: "Teeth Whitening Options in Palm Desert: Professional vs At-Home",
    keyword: "teeth whitening palm desert",
    features: ["hyperlocal", "reviews"],
    hyperlocal: {
      terms: ["El Paseo", "Highway 111 corridor", "Palm Desert Civic Center"],
      source: "HubSpot geo-terms list",
    },
    reviews: {
      quote:
        "The whitening results were amazing — my smile looks ten years younger. Worth every penny.",
      reviewer: "Linda K.",
      rating: 5,
      date: "Feb 15, 2026",
    },
  },
  {
    id: 6,
    date: "Mar 8, 2026",
    practice: "Vista Dental Care",
    hsid: "19384756201",
    title: "Invisalign in Vista: What to Expect From Your First Consultation",
    keyword: "invisalign vista",
    features: ["hyperlocal"],
    hyperlocal: {
      terms: ["Vista Village", "Shadowridge", "Rancho Buena Vista"],
      source: "HubSpot geo-terms list",
    },
    reviews: null,
  },
];

const FEATURE_CONFIG = {
  hyperlocal: {
    label: "Hyperlocal",
    color: "#0d9488",
    bgColor: "#ccfbf1",
    bgMuted: "#f0fdfa",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 7a2 2 0 110-4 2 2 0 010 4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  reviews: {
    label: "Reviews",
    color: "#7c3aed",
    bgColor: "#ede9fe",
    bgMuted: "#f5f3ff",
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1.5l1.85 3.75L14 5.9l-3 2.92.71 4.13L8 10.94l-3.71 2.01.71-4.13-3-2.92 4.15-.65L8 1.5z"
          fill="currentColor"
        />
      </svg>
    ),
  },
};

function FeatureIcon({ feature, isHighlighted, onClick }) {
  const config = FEATURE_CONFIG[feature];
  if (!config) return null;

  const [hovered, setHovered] = useState(false);

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(feature);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={config.label}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: 6,
        color: isHighlighted || hovered ? config.color : "#b0aec5",
        background:
          isHighlighted ? config.bgColor : hovered ? config.bgMuted : "transparent",
        border: isHighlighted
          ? `1px solid ${config.color}33`
          : "1px solid transparent",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {config.icon}
      {hovered && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "3px 8px",
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: "nowrap",
            color: "#fff",
            background: "#1e1b4b",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {config.label}
        </span>
      )}
    </span>
  );
}

function FeatureFilterBar({ activeFilters, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span
        style={{
          fontSize: 12,
          color: "#94a3b8",
          fontWeight: 500,
          marginRight: 2,
        }}
      >
        Features:
      </span>
      {Object.entries(FEATURE_CONFIG).map(([key, config]) => {
        const isActive = activeFilters.includes(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
              border: isActive
                ? `1.5px solid ${config.color}`
                : "1.5px solid #e2e8f0",
              color: isActive ? config.color : "#94a3b8",
              backgroundColor: isActive ? config.bgColor : "transparent",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                color: isActive ? config.color : "#b0aec5",
              }}
            >
              {config.icon}
            </span>
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

function ExpandedDetail({ blog }) {
  const hasHyperlocal = blog.hyperlocal != null;
  const hasReviews = blog.reviews != null;

  return (
    <tr>
      <td
        colSpan={7}
        style={{
          padding: 0,
          borderBottom: "1px solid #e8e5f0",
          background: "#fafafe",
        }}
      >
        <div
          style={{
            padding: "14px 24px 18px 52px",
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {hasHyperlocal && (
            <div
              style={{
                flex: "1 1 260px",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #e0f2f1",
                padding: "12px 16px",
                minWidth: 240,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: "#ccfbf1",
                    color: "#0d9488",
                  }}
                >
                  {FEATURE_CONFIG.hyperlocal.icon}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0d9488",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Hyperlocal Terms
                </span>
                <span
                  style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}
                >
                  {blog.hyperlocal.source}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {blog.hyperlocal.terms.map((term, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 5,
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#134e4a",
                      background: "#f0fdfa",
                      border: "1px solid #99f6e4",
                    }}
                  >
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasReviews && (
            <div
              style={{
                flex: "1 1 320px",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #ede9fe",
                padding: "12px 16px",
                minWidth: 280,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    background: "#ede9fe",
                    color: "#7c3aed",
                  }}
                >
                  {FEATURE_CONFIG.reviews.icon}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#7c3aed",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Google Review
                </span>
                <span
                  style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}
                >
                  {"★".repeat(blog.reviews.rating)} · {blog.reviews.date}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "#374151",
                  fontStyle: "italic",
                  borderLeft: "3px solid #c4b5fd",
                  paddingLeft: 12,
                  margin: "0 0 6px 0",
                }}
              >
                "{blog.reviews.quote}"
              </div>
              <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
                — {blog.reviews.reviewer}
              </div>
            </div>
          )}

          {!hasHyperlocal && !hasReviews && (
            <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 0" }}>
              No enrichment features used for this blog.
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ContentPortal() {
  const [expandedRow, setExpandedRow] = useState(null);
  const [activeFilters, setActiveFilters] = useState([]);
  const [activeTab, setActiveTab] = useState("blogs");
  const [timeRange, setTimeRange] = useState("7");

  const toggleFilter = (feature) => {
    setActiveFilters((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const filteredBlogs =
    activeFilters.length === 0
      ? BLOGS
      : BLOGS.filter((b) =>
          activeFilters.every((f) => b.features.includes(f))
        );

  const stats = { blogs: 223, gmb: 324, replies: 643, today: 77 };

  return (
    <div
      style={{
        fontFamily:
          "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#f8f7fc",
        minHeight: "100vh",
        color: "#1e1b4b",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          padding: "14px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e8e5f0",
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1
            style={{
              fontSize: 19,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Content Portal
          </h1>
          <div
            style={{
              display: "flex",
              gap: 2,
              background: "#f1f0f7",
              borderRadius: 8,
              padding: 2,
            }}
          >
            {["Records", "Errors"].map((tab) => (
              <button
                key={tab}
                style={{
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  background: tab === "Records" ? "#fff" : "transparent",
                  color: tab === "Records" ? "#1e1b4b" : "#94a3b8",
                  boxShadow:
                    tab === "Records" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <button
          style={{
            padding: "7px 16px",
            borderRadius: 8,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: "#312e81",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      <div style={{ padding: "18px 28px", maxWidth: 1440, margin: "0 auto" }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {[
            { label: "BLOGS", value: stats.blogs, sub: "Last 7 days" },
            { label: "GMB POSTS", value: stats.gmb, sub: "Last 7 days" },
            { label: "REPLIES", value: stats.replies, sub: "Last 7 days" },
            { label: "TODAY", value: stats.today, sub: "Total activity" },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: "16px 20px",
                border: "1px solid #e8e5f0",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: "#64748b",
                  marginBottom: 4,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: "1px solid #e8e5f0",
            overflow: "hidden",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              borderBottom: "1px solid #e8e5f0",
            }}
          >
            {[
              { key: "blogs", label: "Blogs", count: 223 },
              { key: "gmb", label: "GMB Posts", count: 324 },
              { key: "replies", label: "Replies", count: 643 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "13px 16px 11px",
                  border: "none",
                  borderBottom:
                    activeTab === tab.key
                      ? "2px solid #312e81"
                      : "2px solid transparent",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? "#1e1b4b" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "1px 7px",
                    borderRadius: 99,
                    background:
                      activeTab === tab.key ? "#e8e5f0" : "transparent",
                    color: activeTab === tab.key ? "#312e81" : "#94a3b8",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div
            style={{
              padding: "12px 24px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              borderBottom: "1px solid #f1f0f7",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                Practice:
              </span>
              <select
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  color: "#1e1b4b",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option>All Practices</option>
              </select>
            </div>

            <div
              style={{
                width: 1,
                height: 22,
                background: "#e2e8f0",
              }}
            />

            <div style={{ display: "flex", gap: 3 }}>
              {[
                { label: "7 Days", value: "7" },
                { label: "30 Days", value: "30" },
                { label: "90 Days", value: "90" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTimeRange(t.value)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 7,
                    border:
                      timeRange === t.value
                        ? "1px solid #312e81"
                        : "1px solid #e2e8f0",
                    fontSize: 12,
                    fontWeight: timeRange === t.value ? 600 : 400,
                    cursor: "pointer",
                    background: timeRange === t.value ? "#f1f0f7" : "#fff",
                    color: timeRange === t.value ? "#312e81" : "#64748b",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div
              style={{
                width: 1,
                height: 22,
                background: "#e2e8f0",
              }}
            />

            <FeatureFilterBar
              activeFilters={activeFilters}
              onToggle={toggleFilter}
            />

            <button
              style={{
                marginLeft: "auto",
                padding: "5px 12px",
                borderRadius: 7,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                background: "#fff",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ↓ Export CSV
            </button>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e8e5f0",
                    background: "#fafafe",
                  }}
                >
                  {[
                    { label: "", w: 36 },
                    { label: "Date", w: 100 },
                    { label: "Practice", w: undefined },
                    { label: "HSID", w: 120 },
                    { label: "Blog Title", w: undefined },
                    { label: "Keyword", w: undefined },
                    { label: "URL", w: 44 },
                  ].map((col, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "9px 12px",
                        paddingLeft: i === 0 ? 20 : 12,
                        textAlign: i === 6 ? "center" : "left",
                        fontWeight: 600,
                        color: "#64748b",
                        fontSize: 11,
                        letterSpacing: "0.03em",
                        width: col.w,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBlogs.map((blog) => {
                  const isExpanded = expandedRow === blog.id;
                  const hasFeatures = blog.features.length > 0;
                  return (
                    <>
                      <tr
                        key={blog.id}
                        onClick={() =>
                          hasFeatures &&
                          setExpandedRow(isExpanded ? null : blog.id)
                        }
                        style={{
                          borderBottom: isExpanded
                            ? "none"
                            : "1px solid #f1f0f7",
                          cursor: hasFeatures ? "pointer" : "default",
                          background: isExpanded ? "#fafafe" : "#fff",
                          transition: "background 0.12s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded)
                            e.currentTarget.style.background = "#fdfcff";
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded)
                            e.currentTarget.style.background = "#fff";
                        }}
                      >
                        {/* Expand chevron */}
                        <td style={{ padding: "11px 6px 11px 20px", width: 36 }}>
                          {hasFeatures && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 18,
                                height: 18,
                                borderRadius: 5,
                                fontSize: 10,
                                color: isExpanded ? "#312e81" : "#c4c1d6",
                                background: isExpanded ? "#e8e5f0" : "transparent",
                                transition: "all 0.15s ease",
                                transform: isExpanded
                                  ? "rotate(90deg)"
                                  : "rotate(0deg)",
                              }}
                            >
                              ▸
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td
                          style={{
                            padding: "11px 12px",
                            color: "#94a3b8",
                            whiteSpace: "nowrap",
                            fontSize: 12,
                          }}
                        >
                          {blog.date}
                        </td>

                        {/* Practice + inline feature icons */}
                        <td style={{ padding: "11px 12px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                              {blog.practice}
                            </span>
                            {blog.features.length > 0 && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 2,
                                  marginLeft: 2,
                                }}
                              >
                                {blog.features.map((f) => (
                                  <FeatureIcon
                                    key={f}
                                    feature={f}
                                    isHighlighted={activeFilters.includes(f)}
                                    onClick={toggleFilter}
                                  />
                                ))}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* HSID */}
                        <td
                          style={{
                            padding: "11px 12px",
                            fontSize: 12,
                          }}
                        >
                          <a
                            href="#"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: "#6366f1",
                              textDecoration: "none",
                              fontWeight: 500,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {blog.hsid}
                          </a>
                        </td>

                        {/* Blog Title */}
                        <td
                          style={{
                            padding: "11px 12px",
                            color: "#374151",
                            maxWidth: 300,
                          }}
                        >
                          <span
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {blog.title}
                          </span>
                        </td>

                        {/* Keyword */}
                        <td
                          style={{
                            padding: "11px 12px",
                            color: "#94a3b8",
                            fontSize: 12,
                          }}
                        >
                          {blog.keyword}
                        </td>

                        {/* URL */}
                        <td style={{ padding: "11px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              cursor: "pointer",
                              color: "#b0aec5",
                              fontSize: 13,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            ↗
                          </span>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedDetail blog={blog} />}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Filter status bar */}
          {activeFilters.length > 0 && (
            <div
              style={{
                padding: "8px 24px",
                borderTop: "1px solid #f1f0f7",
                fontSize: 12,
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>
                Showing {filteredBlogs.length} of {BLOGS.length} blogs with{" "}
                {activeFilters.map((f) => FEATURE_CONFIG[f].label).join(" + ")}
              </span>
              <button
                onClick={() => setActiveFilters([])}
                style={{
                  border: "none",
                  background: "none",
                  fontSize: 12,
                  color: "#6366f1",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 14,
            padding: "0 4px",
          }}
        >
          <span style={{ fontSize: 11, color: "#b0aec5" }}>
            Feature icons appear next to practice names.
          </span>
          <span style={{ fontSize: 11, color: "#b0aec5" }}>
            Click a row to inspect details.
          </span>
          <span style={{ fontSize: 11, color: "#b0aec5" }}>
            Click an icon to filter.
          </span>
        </div>
      </div>
    </div>
  );
}
