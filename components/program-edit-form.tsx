'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Program } from "@/lib/types";

// Define the expected shape of the state prop
type ProgramFormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[] | undefined> | null;
};

interface ProgramEditFormProps {
  state: ProgramFormState;
  program: Program; // Program data to pre-fill
}

// Component for program edit form fields
export function ProgramEditForm({ state, program }: ProgramEditFormProps) {
  return (
    <div className="space-y-4 py-4">
        {/* Hidden input for the program ID */}
        <input type="hidden" name="id" value={program.id} />

        {/* Display general form errors */} 
        {state.errors?._form && (
           <p className="text-sm font-medium text-destructive">{state.errors._form[0]}</p>
        )}
        <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input 
               id="name" 
               name="name" 
               required 
               defaultValue={program.name} // Pre-fill name
               aria-describedby={state.errors?.name ? "edit-name-error" : undefined}
            />
            {state.errors?.name && (
                <p id="edit-name-error" className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>
            )}
        </div>
        <div className="space-y-2">
            <Label htmlFor="description">Description</Label> 
            <Textarea
                id="description"
                name="description"
                placeholder="Provide details about the program..."
                defaultValue={program.description} // Pre-fill description
                aria-describedby={state.errors?.description ? "edit-description-error" : undefined}
            />
            {state.errors?.description && (
                <p id="edit-description-error" className="text-sm font-medium text-destructive">{state.errors.description[0]}</p>
            )}
        </div>
    </div>
  );
} 