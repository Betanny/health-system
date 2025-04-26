import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, User, Calendar, ListChecks, Edit, Trash2, FileX } from "lucide-react"
import { getClientWithEnrollments } from "@/lib/actions/client.actions"
import EnrollClientButton from "./enroll-client-button"
import { EnrollmentEditModal } from "@/components/enrollment-edit-modal";
import { EnrollmentDeleteButton } from "@/components/enrollment-delete-button";
import { z } from "zod";

export default async function ClientProfilePage({ params: { id } }: { params: { id: string } }) {
  
  if (!z.string().uuid({ message: "Invalid client ID format." }).safeParse(id).success) {
    console.error("Invalid client UUID format:", id);
    notFound();
  }

  let clientWithEnrollments;
  try {
    clientWithEnrollments = await getClientWithEnrollments(id);
  } catch (error) {
    console.error(`Failed to fetch client ${id}:`, error);
    notFound();
  }

  if (!clientWithEnrollments) {
    notFound()
  }

  const { enrollments, ...client } = clientWithEnrollments

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    if (typeof dateString !== 'string' || !/\d{4}-\d{2}-\d{2}/.test(dateString)) {
      console.warn("Invalid date string format received for client profile:", dateString);
      return "Invalid Date";
    }
    try {
      return new Date(dateString + 'T00:00:00Z').toLocaleDateString(undefined, {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error("Error formatting date:", dateString, e)
      return "Invalid Date"
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "completed": return "outline";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  }

  return (
    <main className="flex-grow">
      <section className="py-12 md:py-16 lg:py-8 m-4 border border-gray-200 dark:border-white/5 rounded-2xl bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">Client Profile</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <EnrollClientButton clientId={id} />
              <Link href="/clients" passHref>
                <Button variant="outline" className="w-full sm:w-auto rounded-full">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <Card className="lg:col-span-1 rounded-2xl">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-medium">{client.firstName} {client.lastName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span>{formatDate(client.dateOfBirth)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gender</span>
                  <span>{client.gender}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span>{client.contactNumber || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{client.email || "-"}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right">{client.address || "-"}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-muted-foreground text-xs">Client ID</span>
                  <span className="font-mono text-xs text-muted-foreground">{id}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5"/>
                   Program Enrollments
                  </CardTitle>
                <CardDescription>Health programs this client is enrolled in.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 rounded-full">
                    <TabsTrigger value="all" className="rounded-full">All</TabsTrigger>
                    <TabsTrigger value="active" className="rounded-full">Active</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    {enrollments.filter((e) => e.status === "active").length > 0 ? (
                      <div className="space-y-4">
                        {enrollments
                          .filter((e) => e.status === "active")
                          .map((enrollment) => (
                            <Card key={enrollment.id} className="border shadow-sm hover:shadow-md transition-shadow">
                              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                                <div className="space-y-1">
                                   <h3 className="font-semibold text-base sm:text-lg leading-none tracking-tight">{enrollment.program.name}</h3>
                                   <p className="text-xs text-muted-foreground line-clamp-2">{enrollment.program.description || "No description available."}</p>
                                </div>
                                <div className="flex items-center flex-shrink-0 gap-1">
                                  <EnrollmentEditModal
                                    enrollment={{
                                      id: enrollment.id,
                                      enrollmentDate: enrollment.enrollmentDate,
                                      status: enrollment.status,
                                      notes: enrollment.notes,
                                      programName: enrollment.program.name
                                    }}
                                  />
                                  <EnrollmentDeleteButton enrollment={{ id: enrollment.id, program: enrollment.program, client: client }} />
                                </div>
                              </CardHeader>
                              <CardContent className="text-sm pt-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <Badge variant={getStatusBadgeVariant(enrollment.status)} className="capitalize w-fit">{enrollment.status}</Badge>
                                  <div className="text-muted-foreground text-xs sm:text-sm">
                                     Enrolled on: {formatDate(enrollment.enrollmentDate)}
                                  </div>
                                </div>
                                {enrollment.notes && (
                                  <p className="mt-3 text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                                    <span className="font-medium text-foreground">Notes:</span> {enrollment.notes}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileX className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No active program enrollments found.</p>
                      </div>                    )}
                  </TabsContent>

                  <TabsContent value="all">
                    {enrollments.length > 0 ? (
                      <div className="space-y-4">
                        {enrollments.map((enrollment) => (
                          <Card key={enrollment.id} className="border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden bg-white dark:bg-background">
                             <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                <div className="space-y-1">
                                   <h3 className="font-semibold text-base sm:text-lg leading-none tracking-tight text-gray-900 dark:text-gray-50">{enrollment.program.name}</h3>
                                   <p className="text-xs text-muted-foreground line-clamp-2">{enrollment.program.description || "No description available."}</p>
                                </div>
                                <div className="flex items-center flex-shrink-0 gap-1">
                                  <EnrollmentEditModal
                                    enrollment={{
                                      id: enrollment.id,
                                      enrollmentDate: enrollment.enrollmentDate,
                                      status: enrollment.status,
                                      notes: enrollment.notes,
                                      programName: enrollment.program.name
                                    }}
                                  />
                                  <EnrollmentDeleteButton enrollment={{ id: enrollment.id, program: enrollment.program, client: client }} />
                                </div>
                              </CardHeader>
                            <CardContent className="text-sm pt-4 pb-5 px-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <Badge variant={getStatusBadgeVariant(enrollment.status)} className="capitalize w-fit px-3 py-1 font-medium">{enrollment.status}</Badge>
                                <div className="text-muted-foreground text-xs flex items-center">
                                   <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                                   Enrolled on: {formatDate(enrollment.enrollmentDate)}
                                </div>
                              </div>
                              {enrollment.notes && (
                                <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">Notes:</span> {enrollment.notes}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileX className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No program enrollments found.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
