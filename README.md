# Dental Statistics Submission

A web application for dental clinics to record, track, and analyze daily statistics. This system allows dental practitioners to submit daily data, view monthly reports, and generate Excel spreadsheets for record-keeping and analysis.

## Features

- **User Authentication**: Secure login and signup system
- **Daily Data Submission**: Form to record daily dental statistics
- **Monthly View**: Calendar-based view of submitted data
- **Excel Report Generation**: Export data to Excel for further analysis
- **Admin Dashboard**: Administrators can view all users' data
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

### Frontend
- **React**: UI library for building the user interface
- **TypeScript**: Type-safe JavaScript for improved developer experience
- **React Router**: Navigation and routing
- **CSS**: Custom styling with responsive design

### Backend Services (Serverless)
- **Supabase**: 
  - Authentication system
  - PostgreSQL database for data storage
  - Storage buckets for Excel file storage
  - Row Level Security for data protection

### Libraries
- **ExcelJS**: Generating Excel reports
- **file-saver**: Browser-side file saving
- **Vercel Analytics**: User analytics tracking

## Setup

### Prerequisites
- Node.js v14+ and npm
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd dental-statistics-submission
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your Supabase credentials:
