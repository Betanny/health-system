'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Define the expected shape of the state prop
type ProgramFormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[] | undefined> | null;
};

interface ProgramCreateFormProps {
  state: ProgramFormState;
}

// Component for program form fields
export function ProgramCreateForm({ state }: ProgramCreateFormProps) {
  return (
    <div className="space-y-4 py-4">
        {/* Display general form errors */} 
        {state.errors?._form && (
           <p className="text-sm font-medium text-destructive">{state.errors._form[0]}</p>
        )}
        <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input id="name" name="name" required aria-describedby={state.errors?.name ? "name-error" : undefined}/>
            {state.errors?.name && (
                <p id="name-error" className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>
            )}
        </div>
        <div className="space-y-2">
            <Label htmlFor="description">Description</Label> 
            <Textarea
                id="description"
                name="description"
                placeholder="Provide details about the program..."
                aria-describedby={state.errors?.description ? "description-error" : undefined}
            />
            {state.errors?.description && (
                <p id="description-error" className="text-sm font-medium text-destructive">{state.errors.description[0]}</p>
            )}
        </div>
    </div>
  );
} 