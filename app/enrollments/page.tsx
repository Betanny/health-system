import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getAllEnrollmentsWithDetails } from "@/lib/actions/enrollment.actions"
import type { EnrollmentWithDetails } from "@/lib/types"

export default async function EnrollmentsPage() {
  // Fetch enrollments server-side
  let enrollments: EnrollmentWithDetails[] = []
  try {
    enrollments = await getAllEnrollmentsWithDetails()
  } catch (error) {
    console.error("Failed to fetch enrollments for page:", error)
    // Handle error display appropriately
    enrollments = []
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A" // Handle null/undefined/empty string
    // Basic validation: check if it looks like a date string
    if (typeof dateString !== 'string' || !/\d{4}-\d{2}-\d{2}/.test(dateString)) {
        console.warn("Invalid date string format received:", dateString);
        return "Invalid Date";
    }
    try {
      // Use toLocaleDateString for locale-friendly format
      // Ensure we treat the date as UTC to avoid timezone issues
      return new Date(dateString + 'T00:00:00Z').toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) {
      console.error("Error formatting date:", dateString, e)
      return "Invalid Date"
    }
  }

  return (
    <main className="flex-grow">
      <section className=" border border-gray-200 dark:border-white/5 rounded-2xl bg-background py-12 md:py-16 lg:px-3 lg:!py-6 mx-4 my-4">
        <div className="container px-4 md:px-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Program Enrollments</h1>
            {/* Enrollment is being done via the client profile page...so maybe not for now */}
            {/* <p className="text-muted-foreground mt-1">View all client program enrollments.</p> */} 
          </div>

          {/* Enrollments Table Card */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>All Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto"> {/* Add horizontal scroll for small screens */} 
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Client</TableHead> {/* Add min-width */} 
                      <TableHead className="min-w-[150px]">Program</TableHead> {/* Add min-width */} 
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Render data fetched from the database */}
                    {enrollments.length > 0 ? (
                      enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {/* Link using the client ID from the nested client object */}
                            <Link href={`/clients/${enrollment.client.id}`} className="text-primary hover:underline">
                              {/* Display client name from the nested client object */}
                              {enrollment.client.firstName} {enrollment.client.lastName}
                            </Link>
                          </TableCell>
                          {/* Display program name from the nested program object */}
                          <TableCell>{enrollment.program.name}</TableCell>
                          <TableCell>{formatDate(enrollment.enrollmentDate)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                enrollment.status === "active"
                                  ? "default"
                                  : enrollment.status === "completed"
                                    ? "outline"
                                    : "secondary"
                              }
                            >
                              {enrollment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Link using the client ID */}
                            <Link href={`/clients/${enrollment.client.id}`}>
                              <Button variant="outline" size="sm" className="rounded-full">
                                View Client
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No enrollments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}
// MAYBE:
// TODO: Add a modal for enrollment creation
// TODO: Add a modal for enrollment editing
// TODO: Add a modal for enrollment deletion
// TODO: Add a modal for enrollment status update
// TODO: Add a modal for enrollment details view
