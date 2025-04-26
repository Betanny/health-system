'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Enrollment } from "@/lib/types";

// Define the expected shape of the state prop
type EnrollmentFormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[] | undefined> | null;
};

interface EnrollmentEditFormProps {
  state: EnrollmentFormState;
  enrollment: Pick<Enrollment, 'id' | 'enrollmentDate' | 'status' | 'notes'>; // Fields that can be edited
}

// Component for enrollment edit form fields
export function EnrollmentEditForm({ state, enrollment }: EnrollmentEditFormProps) {
  return (
    <div className="space-y-4 py-4">
        {/* Hidden input for the enrollment ID */}
        <input type="hidden" name="id" value={enrollment.id} />

        {/* Display general form errors */} 
        {state.errors?._form && (
           <p className="text-sm font-medium text-destructive">{state.errors._form[0]}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
            <Label htmlFor="edit-enrollmentDate">Enrollment Date *</Label>
            <Input
              id="edit-enrollmentDate"
              name="enrollmentDate"
              type="date"
              required
              defaultValue={enrollment.enrollmentDate} // Pre-fill
              aria-describedby={state.errors?.enrollmentDate ? "edit-enrollmentDate-error" : undefined}
            />
            {state.errors?.enrollmentDate && (
               <p id="edit-enrollmentDate-error" className="text-sm font-medium text-destructive">{state.errors.enrollmentDate[0]}</p>
             )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status *</Label>
            <Select 
               name="status" 
               required 
               defaultValue={enrollment.status} // Pre-fill
               aria-describedby={state.errors?.status ? "edit-status-error" : undefined}> 
              <SelectTrigger id="edit-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
             {state.errors?.status && (
               <p id="edit-status-error" className="text-sm font-medium text-destructive">{state.errors.status[0]}</p>
             )}
          </div>
        </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              name="notes"
              placeholder="Additional information about this enrollment"
              defaultValue={enrollment.notes || ""} // Pre-fill notes
              aria-describedby={state.errors?.notes ? "edit-notes-error" : undefined}
            />
             {state.errors?.notes && (
               <p id="edit-notes-error" className="text-sm font-medium text-destructive">{state.errors.notes[0]}</p>
             )}
          </div>
    </div>
  );
} 