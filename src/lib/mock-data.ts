import { BlogPost, GmbPost, GmbReply, ContentResponse } from '@/types';

// Sample practice names
const practices = [
  'Smile Dental Care',
  'Family Dentistry',
  'Bright Smiles Clinic',
  'Downtown Dental',
  'Riverside Dental Group',
  'Premier Dental Associates',
  'Gentle Care Dentistry',
  'Modern Dental Studio',
];

// Sample keywords
const keywords = [
  'dental implants',
  'teeth whitening',
  'invisalign',
  'root canal',
  'dental cleaning',
  'cosmetic dentistry',
  'emergency dental',
  'pediatric dentistry',
  'dental crowns',
  'gum disease',
];

// Sample blog titles
const blogTitles = [
  '5 Signs You Need a Dental Checkup',
  'The Benefits of Regular Dental Cleanings',
  'Understanding Dental Implants: A Complete Guide',
  'How to Maintain Your Smile After Whitening',
  'Invisalign vs Traditional Braces: Which is Right for You?',
  'Tips for Overcoming Dental Anxiety',
  'The Connection Between Oral Health and Overall Health',
  'What to Expect During a Root Canal Procedure',
  'Choosing the Right Toothbrush for Your Needs',
  'Foods That Are Good (and Bad) for Your Teeth',
];

// Sample GMB post titles
const gmbPostTitles = [
  'New Patient Special: 50% Off First Visit!',
  'Meet Our New Dental Hygienist',
  'Extended Hours Now Available',
  'Thank You for 5-Star Reviews!',
  'Holiday Hours Update',
  'New Teeth Whitening Technology',
  'Join Us for Community Dental Day',
  'Insurance Accepted - Check Your Coverage',
  'Patient Testimonial Spotlight',
  'Now Offering Same-Day Appointments',
];

// Sample replies
const sampleReplies = [
  'Thank you so much for your kind words! We are delighted to hear about your positive experience with our team. We look forward to seeing you at your next appointment!',
  'We appreciate you taking the time to share your feedback. Our team works hard to provide excellent care, and reviews like yours motivate us to keep improving.',
  'Thank you for your review! We are sorry to hear your experience was not perfect. Please contact our office so we can address your concerns directly.',
  'We are thrilled you had a great visit! Dr. Smith and the entire team appreciate your trust in us for your dental care needs.',
  'Thank you for the 5-star review! We are committed to making every visit comfortable and enjoyable for our patients.',
];

// Generate random date within range
function randomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  date.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM - 8 PM
  date.setMinutes(Math.floor(Math.random() * 60));
  return date.toISOString();
}

// Generate mock blogs
function generateBlogs(count: number): BlogPost[] {
  const blogs: BlogPost[] = [];
  for (let i = 0; i < count; i++) {
    blogs.push({
      id: `blog-${i + 1}`,
      date: randomDate(90),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      blogTitle: blogTitles[Math.floor(Math.random() * blogTitles.length)],
      keyword: keywords[Math.floor(Math.random() * keywords.length)],
      url: `https://example.com/blog/${i + 1}`,
    });
  }
  return blogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generate mock GMB posts
function generateGmbPosts(count: number): GmbPost[] {
  const posts: GmbPost[] = [];
  for (let i = 0; i < count; i++) {
    posts.push({
      id: `gmb-${i + 1}`,
      date: randomDate(90),
      practiceName: practices[Math.floor(Math.random() * practices.length)],
      postTitle: gmbPostTitles[Math.floor(Math.random() * gmbPostTitles.length)],
      keyword: keywords[Math.floor(Math.random() * keywords.length)],
      url: `https://business.google.com/posts/${i + 1}`,
    });
  }
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generate mock replies
function generateReplies(count: number): GmbReply[] {
  const replies: GmbReply[] = [];
  for (let i = 0; i < count; i++) {
    replies.push({
      id: `reply-${i + 1}`,
      dateTime: randomDate(90),
      accountName: practices[Math.floor(Math.random() * practices.length)],
      reply: sampleReplies[Math.floor(Math.random() * sampleReplies.length)],
      url: `https://business.google.com/reviews/${i + 1}`,
    });
  }
  return replies.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

// Calculate summary data
function calculateSummary(
  blogs: BlogPost[],
  gmbPosts: GmbPost[],
  replies: GmbReply[]
): { blogs7d: number; gmbPosts7d: number; replies7d: number; todayActivity: number } {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const blogs7d = blogs.filter((b) => new Date(b.date) >= sevenDaysAgo).length;
  const gmbPosts7d = gmbPosts.filter((p) => new Date(p.date) >= sevenDaysAgo).length;
  const replies7d = replies.filter((r) => new Date(r.dateTime) >= sevenDaysAgo).length;

  const todayBlogs = blogs.filter((b) => new Date(b.date) >= today).length;
  const todayPosts = gmbPosts.filter((p) => new Date(p.date) >= today).length;
  const todayReplies = replies.filter((r) => new Date(r.dateTime) >= today).length;

  return {
    blogs7d,
    gmbPosts7d,
    replies7d,
    todayActivity: todayBlogs + todayPosts + todayReplies,
  };
}

// Generate complete mock data
export function generateMockData(): ContentResponse {
  const blogs = generateBlogs(250);
  const gmbPosts = generateGmbPosts(350);
  const replies = generateReplies(180);

  return {
    blogs,
    gmbPosts,
    replies,
    summary: calculateSummary(blogs, gmbPosts, replies),
    practices: [...new Set([...blogs.map((b) => b.practiceName), ...gmbPosts.map((p) => p.practiceName)])].sort(),
    accounts: [...new Set(replies.map((r) => r.accountName))].sort(),
  };
}

// Singleton mock data to maintain consistency during session
let cachedMockData: ContentResponse | null = null;

export function getMockData(): ContentResponse {
  if (!cachedMockData) {
    cachedMockData = generateMockData();
  }
  return cachedMockData;
}

// Reset mock data (for refresh functionality)
export function resetMockData(): ContentResponse {
  cachedMockData = generateMockData();
  return cachedMockData;
}
