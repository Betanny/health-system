import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllPrograms } from "@/lib/actions/program.actions"
import { ProgramCreateModal } from "@/components/program-create-modal"
import { ProgramEditModal } from "@/components/program-edit-modal"
import { ProgramDeleteButton } from "@/components/program-delete-button"
import type { Program } from "@/lib/types"
import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function ProgramsPage() {
  let programs: Program[] = []
  try {
    programs = await getAllPrograms()
  } catch (error) {
    console.error("Failed to fetch programs for page:", error)
    programs = []
    // TODO: Add user-facing error message
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      // Use toLocaleDateString for locale-friendly format
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
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
          <div className="flex flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
            <ProgramCreateModal triggerText="Create New Program" showIcon={true} />
          </div>

          {/* Programs Grid */}
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {programs.length > 0 ? (
              programs.map((program) => (
              <Card key={program.id} className="flex flex-col rounded-2xl bg-background border border-gray-200 dark:border-white/10 transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.03] overflow-hidden">
                <CardHeader className="px-6 pt-5 pb-3">
                  <CardTitle className="text-lg font-semibold tracking-tight">{program.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow px-6 pb-4 flex flex-col">
                  <p className="mb-4 text-sm text-muted-foreground line-clamp-3 flex-grow">
                    {program.description || "No description provided."}
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs font-normal w-fit">
                    <Clock className="mr-1 h-3 w-3 inline-block" />
                    Created: {formatDate(program.createdAt)}
                  </Badge>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 py-3 px-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                  <ProgramEditModal program={program} />
                  <ProgramDeleteButton program={program} />
                </CardFooter>
              </Card>
            ))) : (
              <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-muted-foreground mb-6">No health programs found.</p>
                  <ProgramCreateModal triggerText="Create Your First Program" />
                </CardContent>
              </Card>
            )}
        
            {/* No Programs Card */}
            {programs.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
                <CardContent className="py-12 text-center">
                  <p className="text-lg text-muted-foreground mb-6">No health programs found.</p>
                  <ProgramCreateModal triggerText="Create Your First Program" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
