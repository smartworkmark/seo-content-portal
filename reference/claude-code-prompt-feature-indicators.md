# Feature: Blog Enrichment Indicators & QA Detail View

## Context

This is the SEO Content Portal (hosted on Vercel at `seo-content-portal-seven.vercel.app`). It displays blog, GMB post, and review reply records for dental practice clients. The data is sourced from Google Sheets and surfaced in a table with filters for practice, time range, and content type tabs (Blogs, GMB Posts, Replies).

We are progressively adding enrichment features to the SEO blog pipeline. Two new features have been added to the blog generation workflow (running in n8n):

1. **Hyperlocal Geography** — The blog pipeline now pulls neighborhood names, landmarks, and local geographic terms from a cached field in HubSpot (`local_geography_keywords`). These terms get woven into the blog content to improve local SEO relevance.

2. **Google Reviews (E-E-A-T)** — The pipeline pulls recent Google reviews via the Places API, selects the most relevant review for the blog topic, anonymizes it, and paraphrases it into a third-person snippet included in the blog. This adds Experience/Expertise signals for SEO.

The client team needs to QA these features by:
- Quickly scanning which blogs used which enrichment features
- Filtering the blog list to show only blogs with a specific feature (e.g., "show me all blogs that used hyperlocal terms")
- Expanding a blog row to inspect the specific terms or review quotes that were pulled in

## Reference Implementation

See `/reference/content-portal-v2.jsx` for a working UI mockup of the target design. This is a self-contained React component that demonstrates the exact interaction patterns described below. **Adapt the patterns from this file to fit the existing codebase — do not copy it wholesale.**

## Requirements

### 1. Inline Feature Icons (in the Practice column)

- Add small, icon-based indicators next to the practice name in each blog row
- Use a **map pin icon** for Hyperlocal and a **star icon** for Google Reviews
- Icons should be **muted gray by default** and only show their feature color (teal for hyperlocal, purple for reviews) when:
  - The user hovers over the icon (show a tooltip with the feature name)
  - The corresponding feature filter is active
- Clicking an icon toggles that feature's filter (same as clicking the filter in the toolbar)
- **Do NOT add a new column.** The icons sit inline after the practice name text within the existing Practice cell
- This must scale: if we add 3 more features later, it's just 3 more small icons — no layout changes

### 2. Feature Filter Toggles (in the filter bar)

- Add a "Features:" filter group in the existing filter bar, alongside Practice and time range filters
- Each feature gets a pill-style toggle button with its icon and label text (e.g., pin icon + "Hyperlocal")
- Active state: colored border + tinted background matching the feature color
- Inactive state: gray border, muted text
- When one or more filters are active:
  - Table shows only blogs that have ALL selected features
  - A status bar appears below the table: "Showing X of Y blogs with [Feature Names]" + "Clear filters" link

### 3. Expandable Row Detail Panel

- Rows that have at least one enrichment feature show a **chevron indicator** (▸) in the first cell
- Clicking anywhere on the row expands a detail panel below it (accordion-style, one row open at a time)
- The expanded panel contains **cards** for each feature present on that blog:

**Hyperlocal Card:**
- Header: pin icon + "HYPERLOCAL TERMS" label + source annotation (e.g., "HubSpot geo-terms list")
- Body: the specific terms displayed as small chips/tags (e.g., "Yucaipa Boulevard", "Chapman Heights")

**Google Review Card:**
- Header: star icon + "GOOGLE REVIEW" label + star rating + review date
- Body: the quoted review text (italic, with left border accent) + reviewer name attribution

- Rows with no features should NOT be clickable and should NOT show a chevron
- The panel design should be extensible: adding a new feature type = adding a new card type in the panel

### 4. Feature Configuration Pattern

All feature definitions should live in a single configuration object, like:

```javascript
const FEATURE_CONFIG = {
  hyperlocal: {
    label: "Hyperlocal",
    color: "#0d9488",      // teal
    bgColor: "#ccfbf1",
    icon: MapPinIcon,       // or whatever icon library the project uses
  },
  reviews: {
    label: "Reviews",
    color: "#7c3aed",      // purple
    bgColor: "#ede9fe",
    icon: StarIcon,
  },
};
```

Adding a future feature (e.g., "Competitor Analysis") should only require adding an entry to this config + ensuring the data source includes the new field. No table restructuring, no new columns, no layout changes.

### 5. Data Layer

Each blog record needs the following additional fields. Check how blog data is currently being fetched (likely from Google Sheets via API) and determine where these fields should come from:

- `features`: array of feature keys present (e.g., `["hyperlocal", "reviews"]` or `[]`)
- `hyperlocal_terms`: array of strings (the geographic terms used), or null
- `hyperlocal_source`: string describing the data source (e.g., "HubSpot geo-terms list")
- `review_quote`: string (the review text that was pulled into the blog), or null
- `review_reviewer`: string (reviewer display name), or null
- `review_rating`: number (1-5 star rating), or null
- `review_date`: string (date of the review), or null

If these fields don't exist in the data source yet, add placeholder/mock data for now and leave a clear TODO comment indicating where the real data will come from. The n8n pipeline will be updated to write these fields to the data source.

## Design Constraints

- Match the existing portal's visual language (indigo/purple accent palette, current typography, border radius patterns)
- Keep the table compact — no new columns beyond what currently exists
- The HSID column must remain visible (this is a HubSpot ID the client uses for cross-referencing)
- Mobile responsiveness: icons should still be visible on smaller screens; the expanded detail panel should stack cards vertically on narrow viewports
- All animations should be subtle (expand/collapse, hover state transitions) — nothing flashy

## Testing Checklist

- [ ] Blog with both features shows both icons, both cards in expanded view
- [ ] Blog with only hyperlocal shows pin icon only, hyperlocal card only
- [ ] Blog with only reviews shows star icon only, review card only  
- [ ] Blog with no features shows no icons, no chevron, row is not expandable
- [ ] Feature filter: selecting "Hyperlocal" hides blogs without hyperlocal
- [ ] Feature filter: selecting both features shows only blogs with BOTH
- [ ] Clicking an inline icon toggles the corresponding filter
- [ ] Filter status bar shows correct count and "Clear filters" works
- [ ] Only one row can be expanded at a time
- [ ] Expanded panel collapses when clicking the same row again
