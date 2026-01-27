# SEO Agent Content Portal

A Next.js-based content management portal for tracking and managing SEO-related content including blog posts, Google My Business (GMB) posts, and GMB review replies. Data is sourced from Google Sheets and presented in an intuitive, filterable dashboard.

## Features

### Dashboard Overview
- **Summary Cards**: Quick stats showing content activity over the last 7 days and today
  - Blogs published in last 7 days
  - GMB posts in last 7 days
  - Review replies in last 7 days
  - Total activity for today
- **Real-time Data**: Fetches latest data from Google Sheets with refresh capability
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Content Management

#### 1. Blog Posts
Track and manage blog content with the following information:
- Publication date and time
- Practice name
- Blog title
- Target keyword
- Post URL (with automatic validation)

#### 2. GMB Posts
Monitor Google My Business posts including:
- Publication date and time
- Practice name
- Post title
- Target keyword
- Post URL (with automatic validation)

#### 3. GMB Review Replies
Track responses to Google reviews with:
- Reply date and time
- Account name
- Reply text
- Review URL (with automatic validation)

### Filtering & Sorting

- **Practice/Account Filter**: Filter content by specific practices or accounts
- **Date Range Filter**: View content from last 7 days, 30 days, or all time
- **Column Sorting**: Sort any column in ascending or descending order
- **Smart URL Validation**: Automatically filters out records with invalid or placeholder URLs

### Data Export

- Export filtered data to CSV format
- Includes all visible columns based on current filters
- Automatic filename with current date

## URL Validation

The portal includes intelligent URL validation to ensure data quality:

### What Gets Accepted ✅
- Full URLs: `https://example.com/path`
- URLs without protocol: `www.example.com/path`
- Minimal domains: `example.com/path`
- Any valid domain with a top-level domain (TLD)

### What Gets Filtered Out ❌
- Empty or null URLs
- Placeholder text: "TBD", "pending", "N/A", "coming soon", "todo"
- Invalid protocols: `ftp://`, `file://`
- Malformed URLs
- Domains without TLD: "localhost", "internalserver"
- Random text that isn't a valid URL

This validation happens both:
- **Server-side**: When fetching data from Google Sheets
- **Client-side**: When applying filters in the UI

## Technology Stack

### Core Framework
- **Next.js 16.1.3**: React framework with App Router
- **React 19**: Latest React with Server Components
- **TypeScript**: Full type safety across the application

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui Components**: High-quality, accessible UI components
  - Button, Card, Select, Table, Tabs components
- **Lucide React**: Icon library
- **Geist Font**: Optimized font family from Vercel

### Data Integration
- **Google Sheets API**: Direct integration for real-time data fetching
- **Public API Access**: No OAuth required (uses API key)
- **Mock Data Fallback**: Automatic fallback if Google Sheets not configured

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with fonts and metadata
│   ├── page.tsx                 # Main dashboard page
│   └── api/
│       └── content/
│           └── route.ts         # API endpoint for content fetching
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── tabs.tsx
│   ├── Dashboard.tsx            # Main dashboard component
│   ├── DataTable.tsx            # Data table with sorting/pagination
│   ├── Filters.tsx              # Filter controls
│   └── SummaryCards.tsx         # Statistics cards
├── lib/                         # Utility functions and data logic
│   ├── google-sheets.ts         # Google Sheets integration
│   ├── mock-data.ts             # Mock data for development
│   └── utils.ts                 # Utility functions (filters, validation, etc.)
├── hooks/                       # Custom React hooks
│   └── useContentData.ts        # Data fetching hook
└── types/                       # TypeScript type definitions
    └── index.ts                 # Content types and interfaces
```

## Setup & Installation

### Prerequisites
- Node.js 18.0 or higher
- npm, yarn, pnpm, or bun
- Google Sheets with properly formatted data (optional, works with mock data)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd content-portal
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Configure environment variables (optional):

Create a `.env.local` file in the root directory:
```env
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_API_KEY=your_google_api_key
```

**Note**: If you don't configure Google Sheets, the app will automatically use mock data for development.

### Google Sheets Setup

If you want to use real Google Sheets data:

1. **Create a Google Sheet** with three tabs:
   - `Blogs`
   - `GMB Posts`
   - `GMB Replies`

2. **Format your sheets** with these columns:

   **Blogs Sheet:**
   - Date
   - Time
   - Practice Name
   - Practice URL
   - Blog Title
   - Post URL
   - Webflow Item ID
   - Webflow Collection ID
   - Keyword
   - Make Execution
   - Notes

   **GMB Posts Sheet:**
   - Date
   - Time
   - Practice Name
   - Practice URL
   - Post Title
   - Post URL
   - Make Execution
   - Keyword

   **GMB Replies Sheet:**
   - Account Name
   - Date Time
   - Reply
   - Reviews URL
   - Make Execution
   - Review ID
   - Location ID

3. **Get Google API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Sheets API
   - Create credentials (API Key)
   - Add the API key to `.env.local`

4. **Make sheet public** or configure sharing:
   - Share the sheet with "Anyone with the link can view"
   - Copy the spreadsheet ID from the URL
   - Add the ID to `.env.local`

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Key Features Implementation

### URL Sanitization (Blogs Only)
Blog URLs are automatically sanitized to remove localhost prefixes:
- `http://localhost:3000/example.com/path` → `https://example.com/path`
- Missing protocols are automatically added with `https://`

### Smart Filtering
All three content types (blogs, GMB posts, replies) support:
- Filtering by practice/account
- Filtering by date range
- URL validation filtering
- Combined filter logic

### Data Caching
- Google Sheets API responses are not cached (`cache: 'no-store'`)
- Fresh data on every page load
- Manual refresh available via refresh button

### Type Safety
Full TypeScript coverage with defined interfaces:
- `BlogPost` - Blog post data structure
- `GmbPost` - GMB post data structure
- `GmbReply` - Review reply data structure
- `ContentResponse` - API response structure
- Additional utility types for filters and sorting

## API Endpoints

### GET `/api/content`
Fetches all content from Google Sheets or returns mock data.

**Query Parameters:**
- `forceRefresh` (optional): Set to `true` to reset mock data

**Response:**
```json
{
  "blogs": [...],
  "gmbPosts": [...],
  "replies": [...],
  "summary": {
    "blogs7d": 10,
    "gmbPosts7d": 8,
    "replies7d": 15,
    "todayActivity": 3
  },
  "practices": ["Practice 1", "Practice 2", ...],
  "accounts": ["Account 1", "Account 2", ...]
}
```

## Deployment

### Deploy on Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Deploy Elsewhere

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm run start
```

The app will be available on port 3000 by default.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SHEETS_ID` | No | Google Sheets spreadsheet ID |
| `GOOGLE_API_KEY` | No | Google API key for Sheets API access |

**Note**: Without these variables, the app will use mock data automatically.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting and type checks
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For questions or issues, please contact the development team.
