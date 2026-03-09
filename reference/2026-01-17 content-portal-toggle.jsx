import React, { useState } from 'react';

export default function ContentPortalMockup() {
  const [showErrors, setShowErrors] = useState(false);
  
  const normalData = {
    blogs: { count: 197, label: 'Last 7 days' },
    gmbPosts: { count: 291, label: 'Last 7 days' },
    replies: { count: 554, label: 'Last 7 days' },
    today: { count: 75, label: 'Total activity' },
    records: [
      { date: 'Jan 17, 2026, 5:08 PM', account: 'Periodontics & Implant Center of Hoboken', content: 'Thank you so much, Randa! We\'re thrilled Dr. Andrawis could help during your eme...' },
      { date: 'Jan 17, 2026, 5:07 PM', account: 'Green Dental of Alexandria', content: 'Thanks so much, L! We\'re thrilled your smile turned out amazing. 😊 Can\'t wait t...' },
      { date: 'Jan 17, 2026, 5:07 PM', account: 'JW Family Dentistry', content: 'Thank you so much, Samik! We\'re thrilled you had such a great experience with ou...' },
      { date: 'Jan 17, 2026, 5:07 PM', account: 'JW Family Dentistry', content: 'Thank you so much, Saloni! We\'re thrilled you had such a great experience with u...' },
    ]
  };
  
  const errorData = {
    blogs: { count: 23, label: 'Failed to process' },
    gmbPosts: { count: 41, label: 'Failed to process' },
    replies: { count: 12, label: 'Failed to process' },
    today: { count: 3, label: 'Recent errors' },
    records: [
      { date: 'Jan 16, 2026, 3:22 PM', account: 'Smile Studio NYC', content: 'Error: API timeout - GMB post failed to publish after 3 retries' },
      { date: 'Jan 16, 2026, 11:45 AM', account: 'Downtown Dental Care', content: 'Error: Invalid location ID - Blog generation failed' },
      { date: 'Jan 15, 2026, 4:18 PM', account: 'Pacific Coast Dentistry', content: 'Error: Rate limit exceeded - Reply not sent' },
      { date: 'Jan 15, 2026, 2:30 PM', account: 'Bright Smiles Family Dental', content: 'Error: Missing required field (practice_name) - Blog skipped' },
    ]
  };
  
  const data = showErrors ? errorData : normalData;
  
  // Color schemes
  const colors = showErrors ? {
    accent: '#b45309', // amber-700
    accentLight: '#fef3c7', // amber-100
    accentMedium: '#f59e0b', // amber-500
    cardBorder: '#fcd34d', // amber-300
    bgTint: '#fffbeb', // amber-50
    buttonBg: '#f59e0b',
    buttonText: '#ffffff',
    tabUnderline: '#f59e0b',
  } : {
    accent: '#4f46e5', // indigo-600
    accentLight: '#eef2ff', // indigo-50
    accentMedium: '#6366f1', // indigo-500
    cardBorder: '#e5e7eb', // gray-200
    bgTint: '#ffffff',
    buttonBg: '#4f46e5',
    buttonText: '#ffffff',
    tabUnderline: '#4f46e5',
  };

  return (
    <div className="min-h-screen p-6 transition-colors duration-300" style={{ backgroundColor: colors.bgTint }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Content Portal</h1>
            
            {/* Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setShowErrors(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  !showErrors 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Records
              </button>
              <button
                onClick={() => setShowErrors(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-1.5 ${
                  showErrors 
                    ? 'bg-amber-500 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>Errors</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  showErrors ? 'bg-amber-600' : 'bg-gray-200 text-gray-600'
                }`}>
                  76
                </span>
              </button>
            </div>
          </div>
          
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors duration-200"
            style={{ backgroundColor: colors.buttonBg }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        
        {/* Error mode banner */}
        {showErrors && (
          <div className="mb-4 px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-2 text-amber-800 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Viewing error log — these records failed to process and are kept for reference</span>
          </div>
        )}
        
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div 
            className="bg-white rounded-xl p-5 border-2 transition-colors duration-200"
            style={{ borderColor: showErrors ? colors.cardBorder : '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {showErrors ? 'Blog Errors' : 'Blogs'}
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-3xl font-bold" style={{ color: showErrors ? colors.accent : '#111827' }}>
              {data.blogs.count}
            </div>
            <div className="text-sm text-gray-500">{data.blogs.label}</div>
          </div>
          
          <div 
            className="bg-white rounded-xl p-5 border-2 transition-colors duration-200"
            style={{ borderColor: showErrors ? colors.cardBorder : '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {showErrors ? 'GMB Errors' : 'GMB Posts'}
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold" style={{ color: showErrors ? colors.accent : '#111827' }}>
              {data.gmbPosts.count}
            </div>
            <div className="text-sm text-gray-500">{data.gmbPosts.label}</div>
          </div>
          
          <div 
            className="bg-white rounded-xl p-5 border-2 transition-colors duration-200"
            style={{ borderColor: showErrors ? colors.cardBorder : '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {showErrors ? 'Reply Errors' : 'Replies'}
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="text-3xl font-bold" style={{ color: showErrors ? colors.accent : '#111827' }}>
              {data.replies.count}
            </div>
            <div className="text-sm text-gray-500">{data.replies.label}</div>
          </div>
          
          <div 
            className="bg-white rounded-xl p-5 border-2 transition-colors duration-200"
            style={{ borderColor: showErrors ? colors.cardBorder : '#e5e7eb' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                {showErrors ? 'Recent' : 'Today'}
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-3xl font-bold" style={{ color: showErrors ? colors.accent : '#111827' }}>
              {data.today.count}
            </div>
            <div className="text-sm text-gray-500">{data.today.label}</div>
          </div>
        </div>
        
        {/* Tabs and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex items-center gap-6 px-5 pt-4">
              <button className="text-gray-500 hover:text-gray-700 pb-3 text-sm font-medium">
                {showErrors ? 'Blog Errors' : 'Blogs'} <span className="text-gray-400">{data.blogs.count}</span>
              </button>
              <button className="text-gray-500 hover:text-gray-700 pb-3 text-sm font-medium">
                {showErrors ? 'GMB Errors' : 'GMB Posts'} <span className="text-gray-400">{data.gmbPosts.count}</span>
              </button>
              <button 
                className="pb-3 text-sm font-medium border-b-2 -mb-px"
                style={{ 
                  color: showErrors ? colors.accent : colors.accent,
                  borderColor: colors.tabUnderline 
                }}
              >
                {showErrors ? 'Reply Errors' : 'Replies'} <span style={{ color: showErrors ? colors.accentMedium : colors.accentMedium }}>{data.replies.count}</span>
              </button>
            </div>
          </div>
          
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Account:</span>
                  <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                    <option>All Accounts</option>
                  </select>
                </div>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button className="px-3 py-1 text-sm bg-white rounded-md shadow-sm">Last 7 Days</button>
                  <button className="px-3 py-1 text-sm text-gray-600">Last 30 Days</button>
                  <button className="px-3 py-1 text-sm text-gray-600">All Time</button>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
            
            {/* Table */}
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Date/Time ↕</th>
                  <th className="pb-3 font-medium">Account ↕</th>
                  <th className="pb-3 font-medium">{showErrors ? 'Error Details' : 'Reply'}</th>
                  <th className="pb-3 font-medium text-right">URL</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((record, index) => (
                  <tr key={index} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 text-sm text-gray-600 align-top">{record.date}</td>
                    <td className="py-4 text-sm font-medium text-gray-900 align-top">{record.account}</td>
                    <td className="py-4 text-sm text-gray-600 align-top">
                      <span className={showErrors ? 'text-amber-700' : ''}>
                        {record.content}
                      </span>
                      <button 
                        className="block text-sm mt-1"
                        style={{ color: colors.accentMedium }}
                      >
                        Show more
                      </button>
                    </td>
                    <td className="py-4 text-right align-top">
                      <button style={{ color: colors.accentMedium }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Footer hint */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Click the toggle above to switch between Records and Errors views
        </p>
      </div>
    </div>
  );
}
