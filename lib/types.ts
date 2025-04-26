// Client type definition
export type Client = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  contactNumber: string
  email: string
  address: string
  createdAt: string
  updatedAt: string
}

// Program type definition
export type Program = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

// Enrollment type definition
export type Enrollment = {
  id: string
  clientId: string
  programId: string
  enrollmentDate: string
  status: "active" | "completed" | "withdrawn"
  notes?: string
  createdAt: string
  updatedAt: string
}

// Extended client type with program enrollments
export type ClientWithEnrollments = Client & {
  enrollments: (Enrollment & { program: Program })[]
}

// Type for the Enrollments page, including basic client/program info
export type EnrollmentWithDetails = Enrollment & {
    client: Pick<Client, 'id' | 'firstName' | 'lastName'>;
    program: Pick<Program, 'id' | 'name'>;
};
