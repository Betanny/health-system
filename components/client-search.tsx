'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

// Define the props for the component, including the callback
interface ClientSearchProps {
  onSearchChange: (query: string) => void;
}

export function ClientSearch({ onSearchChange }: ClientSearchProps) {

  const [query, setQuery] = useState(''); // Local state for the input value

  const handleSearch = () => {
    onSearchChange(query);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setQuery(newQuery);
      // Optional: trigger search on every key press
      // onSearchChange(newQuery);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        placeholder="Search by name, email, or contact..."
        value={query}
        className="rounded-full text-sm md flex-1 pl-5 bg-gray-100 dark:bg-[#212121] border-gray-200 dark:border-gray-800"
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
      />
      <Button onClick={handleSearch} className="rounded-full shrink-0">
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </div>
  );
} 