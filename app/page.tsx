import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, Users, Activity, ClipboardList } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col max-h-screen">
      <main className="flex-grow">
        <section className="py-2 md:py-16 lg:py-2 mx-4 my-4">
          <div className="container">
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-white dark:bg-background border border-gray-200 dark:border-white/5 shadow-sm rounded-2xl hover:shadow-md dark:hover:shadow-white/5 transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                    <Users className="h-5 w-5" />
                    Clients
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-200/70">Register and manage client information</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-end">
                  <Link href="/clients" passHref>
                    <Button variant="secondary" className="w-full mt-4 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white rounded-full dark:text-black ">
                      View Clients
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-background border border-gray-200 dark:border-white/5 shadow-sm rounded-2xl hover:shadow-md dark:hover:shadow-white/5 transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                    <Activity className="h-5 w-5" />
                    Programs
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-200/70">Create and manage health programs</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-end">
                  <Link href="/programs" passHref>
                    <Button variant="secondary" className="w-full mt-4 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white rounded-full dark:text-black ">
                      View Programs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-background border border-gray-200 dark:border-white/5 shadow-sm rounded-2xl hover:shadow-md dark:hover:shadow-white/5 transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-50">
                    <ClipboardList className="h-5 w-5" />
                    Enrollments
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-200/70">Manage client program enrollments</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-end">
                  <Link href="/enrollments" passHref>
                    <Button variant="secondary" className="w-full mt-4 bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-white rounded-full dark:text-black ">
                      View Enrollments
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}
