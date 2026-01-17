# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based content portal for managing SEO content (blogs, GMB posts, and review replies) sourced from Google Sheets. The application uses TypeScript throughout and follows a modern React pattern with Server Components and client-side interactivity.

## Commands

### Development
```bash
npm run dev        # Start development server (usually port 3000)
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npx tsc --noEmit   # Type check without emitting files
```

## Architecture

### Data Flow

The application follows a specific data flow pattern:

1. **Google Sheets → Server → API → Client → UI**
   - `src/lib/google-sheets.ts` fetches raw data from Google Sheets API (or mock data)
   - `src/app/api/content/route.ts` wraps this in a Next.js API route
   - `src/hooks/useContentData.ts` fetches from API and applies client-side filters
   - Components consume filtered data from the hook

2. **Filtering happens at TWO levels:**
   - **Server-side** (`google-sheets.ts`): Filters out invalid records during parsing (empty required fields, invalid URLs)
   - **Client-side** (`utils.ts`): Additional filtering based on user selections (practice, date range, URL validation)

3. **URL Validation is critical:**
   - `isValidUrl()` in `src/lib/utils.ts` validates ALL URLs
   - Accepts URLs with or without `http://`/`https://` prefix
   - Rejects placeholder text ("TBD", "pending", etc.)
   - Used in BOTH server and client filtering
   - Blog URLs also get sanitization to remove localhost prefixes

### Key Architectural Patterns

**Google Sheets Integration:**
- Requires `GOOGLE_SHEETS_ID` and `GOOGLE_API_KEY` in `.env.local`
- Falls back to mock data automatically if not configured
- No OAuth required (uses public API with API key)
- Expected sheet names: "Blogs", "GMB Posts", "GMB Replies"
- Data is NOT cached (`cache: 'no-store'`) for fresh data

**Type System:**
- All content types defined in `src/types/index.ts`
- Three main content types: `BlogPost`, `GmbPost`, `GmbReply`
- Unified filtering interface via `DateRange` and filter functions
- Path alias `@/*` maps to `./src/*`

**Component Structure:**
- `src/app/page.tsx` is the main dashboard (Client Component)
- `src/components/DataTable.tsx` handles display, sorting, and pagination
- `src/components/Filters.tsx` manages practice/account and date range selection
- `src/hooks/useContentData.ts` centralizes data fetching and filter application
- All UI components follow a consistent pattern with loading states

**State Management:**
- No global state library (React hooks only)
- Filter state lives in parent component and flows down
- `useContentData` hook manages server state and filtered results
- Local component state for UI concerns (sorting, pagination, expansion)
- Saved filters persist in localStorage via `useSavedFilters` hook
- **Automatic re-sync:** Data automatically re-syncs from Google Sheets every hour (3,600,000ms)

**Saved Filters System:**
- Users can select multiple practices via `MultiSelectDropdown` component
- Filter configurations can be saved with custom names
- Stored in localStorage (key: `content-portal-saved-filters`)
- Filters are tab-specific (blogs, gmb-posts, replies have separate saved filters)
- Empty practices array `[]` means "all practices" - simplifies storage/comparison

### Important Files to Understand

**Data Layer:**
- `src/lib/google-sheets.ts` - Core data fetching, parsing, and server-side filtering
  - `sanitizeBlogUrl()` - Removes localhost prefixes, adds https:// protocol
  - `parseBlogs()`, `parseGmbPosts()`, `parseReplies()` - Parse and filter sheet data
  - `calculateSummary()` - Generate dashboard statistics

**Utilities:**
- `src/lib/utils.ts` - Core utility functions
  - `isValidUrl()` - **CRITICAL**: Validates URLs, accepts URLs without protocol
  - `filterBlogs()`, `filterGmbPosts()`, `filterReplies()` - Client-side filtering (accept `string[]` for practices)
  - All filters apply practice/account, date range, AND URL validation
- `src/lib/saved-filters.ts` - localStorage CRUD for saved filters
  - `getSavedFilters()`, `saveFilter()`, `deleteFilter()`

**Types:**
- `src/types/index.ts` - All TypeScript interfaces and types
  - Content types: `BlogPost`, `GmbPost`, `GmbReply`
  - `SavedFilter`, `SavedFiltersStore` - Saved filter persistence
  - Column configurations for tables

## Google Sheets Schema

The application expects three sheets with specific column structures:

**Blogs:**
- Date, Time, Practice Name, Practice URL, Blog Title, Post URL, Webflow Item ID, Webflow Collection ID, Keyword, Make Execution, Notes
- Required: Date, Practice Name, Blog Title, Post URL (valid)

**GMB Posts:**
- Date, Time, Practice Name, Practice URL, Post Title, Post URL, Make Execution, Keyword
- Required: Date, Practice Name, Post Title, Post URL (valid)

**GMB Replies:**
- Account Name, Date Time, Reply, Reviews URL, Make Execution, Review ID, Location ID
- Required: Date Time, Account Name, Reply, Reviews URL (valid)

## Critical Implementation Details

### URL Validation Logic
When modifying URL handling, understand the validation flow:
1. Raw URL from sheet may or may not have protocol
2. `sanitizeBlogUrl()` removes localhost prefixes (blogs only)
3. `isValidUrl()` validates the URL:
   - Trims whitespace
   - Rejects common placeholders
   - Temporarily adds `https://` if no protocol for validation
   - Uses `URL` constructor to validate
   - Requires hostname with TLD (must contain `.`)
4. Both server and client filters use `isValidUrl()`

### Filter Application Order
1. Parse data from sheets → apply server filters (required fields + valid URLs)
2. Calculate summary stats from filtered data
3. Client applies user-selected filters (practice/account, date range)
4. Client re-validates URLs as additional safety

### Date Handling
- Blogs/GMB Posts combine separate Date and Time columns into single datetime string
- Replies use single "Date Time" column
- Date parsing is lenient (handles various formats)
- Date filtering uses threshold comparison (7d, 30d, all)
- Today's activity calculation uses date-only comparison (ignores time)

## Common Gotchas

1. **Don't bypass URL validation** - It's intentionally applied at multiple levels for data quality
2. **Mock data fallback is automatic** - If Google Sheets isn't configured, app uses mock data without errors
3. **Date vs DateTime** - Blogs/GMB Posts use `date` field, Replies use `dateTime` field
4. **Practice filters use arrays** - `selectedPractices: string[]` where empty array means "all"
5. **Saved filters are tab-specific** - Each content type (blogs/gmb-posts/replies) has its own saved filters
6. **API route handles its own caching** - Don't add caching in hook; it's controlled by API response headers
7. **sanitizeBlogUrl only applies to blogs** - GMB posts and replies use raw URLs from sheets
8. **SavedFiltersBar only shows when needed** - Requires either existing saved filters OR selected practices to appear

## Environment Variables

Required for production Google Sheets integration (optional for development):
- `GOOGLE_SHEETS_ID` - Spreadsheet ID from Google Sheets URL
- `GOOGLE_API_KEY` - Google API key with Sheets API enabled

The app gracefully falls back to mock data if these are not set.
