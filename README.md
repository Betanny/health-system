# Health Information System

A comprehensive health information system built with Next.js that allows healthcare providers to manage clients and health programs efficiently.

## Features

- **Program Management**: Create and manage health programs (TB, Malaria, HIV, etc.)
- **Client Registration**: Register new clients with personal and contact information
- **Program Enrollment**: Enroll clients in one or more health programs
- **Client Search**: Search for clients by name, email, or contact number
- **Client Profiles**: View detailed client information and program enrollments
- **API Access**: Access client data via RESTful API endpoints

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI Components**: radix/ui
- **Styling**: Tailwind CSS
- **State Management**: React Hooks
- **Data Handling**: Server Actions

## Environment Variables

Create a `env.local` with the following contents:

```bash
NEON_DATABASE_URL=""
ENCRYPTION_KEY=""
JWT_ACCESS_TOKEN_EXPIRES_IN=2h
JWT_SECRET=""
```

## Security Considerations

- Data validation on both client and server sides
- Type safety with TypeScript
- Proper error handling and user feedback
- API endpoints with appropriate status codes and error messages

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

