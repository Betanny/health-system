'use client'; // Add use client directive

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllClients } from "@/lib/actions/client.actions"; 
import { ClientSearch } from "@/components/client-search"; 
import { ClientCreateModal } from "@/components/client-create-modal"; 
import { ClientEditModal } from "@/components/client-edit-modal";
import { ClientDeleteButton } from "@/components/client-delete-button";
import type { Client } from "@/lib/types";
import { Eye } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";

export default function ClientsPage() { 
  // State for all clients, search query, and filtered results
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Define the fetching function using useCallback to stabilize its identity
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const clientsData = await getAllClients();
      setAllClients(clientsData);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setError("Failed to load clients. Please try again later.");
      setAllClients([]); // Ensure clients is an empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies needed if getAllClients doesn't change

  // Fetch all clients on component mount using the extracted function
  useEffect(() => {
    fetchClients();
  }, [fetchClients]); // Depend on the memoized fetchClients function

  // Filter clients based on search query (memoized for performance)
  const filteredClients = useMemo(() => {
    if (!searchQuery) {
      return allClients;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return allClients.filter(client => 
      client.firstName.toLowerCase().includes(lowerCaseQuery) ||
      client.lastName.toLowerCase().includes(lowerCaseQuery) ||
      (client.email && client.email.toLowerCase().includes(lowerCaseQuery)) ||
      (client.contactNumber && client.contactNumber.includes(searchQuery)) // Keep original for phone numbers
    );
  }, [allClients, searchQuery]);

  // Handler for search query changes from ClientSearch component
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <main className="flex-grow">
      <section className=" border border-gray-200 dark:border-white/5 rounded-2xl bg-background py-12 md:py-16 lg:px-3 lg:!py-6 mx-4 my-4">
        <div className="container px-4 md:px-6">
          {/* Page Header */}
          <div className="flex flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <ClientCreateModal 
              triggerText="Register New Client" 
              showIcon={true} 
              onSuccess={fetchClients} // Pass the callback here
            />
          </div>

          {/* Search Card */}
          <Card className="mb-8 pt-8 rounded-2xl bg-gray-50 dark:bg-[#121212]">

            <CardContent>
              <ClientSearch onSearchChange={handleSearchChange} />
            </CardContent>
          </Card>

          {/* Client List Card */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Client List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto"> {/* Add horizontal scroll for small screens */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead> {/* Add min-width */}
                      <TableHead>Gender</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="min-w-[150px]">Email</TableHead> {/* Add min-width */}
                      <TableHead className="text-right min-w-[180px]">Actions</TableHead> {/* Add min-width */} 
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading clients...
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                       <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-red-600">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : filteredClients.length > 0 ? (
                      // Render the filtered list
                      filteredClients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">
                            {client.firstName} {client.lastName}
                          </TableCell>
                          <TableCell>{client.gender}</TableCell>
                          <TableCell className="text-sm underline italic">{client.contactNumber}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell className="flex justify-end gap-1"> {/* Allow wrapping */} 
                            <Link href={`/clients/${client.id}`}> 
                              <Button variant="ghost"  className="rounded-full bg-gray-100 dark:bg-[#212121]"><Eye className="h-4 w-4" /> View</Button>
                            </Link>
                            <ClientEditModal client={client} onSuccess={fetchClients} />
                            <ClientDeleteButton client={client} onSuccess={fetchClients} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {/* Adjust the "no results" message based on whether a search is active */}
                          {searchQuery ? `No clients found matching "${searchQuery}"` : "No clients registered yet."} 
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
  );
}
