'use client'

import React, { useState, useEffect, useActionState } from 'react'
import { useFormStatus, useFormState } from 'react-dom'
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { updateProgramAction } from "@/lib/actions/program.actions"
import { ProgramEditForm } from "./program-edit-form"
import type { Program } from "@/lib/types"
import { Pencil } from 'lucide-react'

// Define the initial state
const initialState = {
  success: false,
  errors: null,
  message: null,
};

// Submit button for the edit form
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

interface ProgramEditModalProps {
  program: Program; // Program data to edit
  // Optional: Customize trigger appearance if needed
  trigger?: React.ReactNode; 
}

export function ProgramEditModal({ program, trigger }: ProgramEditModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // Use useActionState with the update action
  const [state, formAction] = useActionState(updateProgramAction, initialState);

  // Effect to handle success/error messages and closing the modal
  useEffect(() => {
    if (state.success === true) {
      toast({ title: "Success", description: state.message || "Program updated successfully!" });
      setOpen(false); // Close modal on success
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
      // Keep modal open on error so user can see inline field errors
    }
  }, [state, toast]);

  // Default trigger if none is provided
  const defaultTrigger = (
     <Button variant="ghost" size="icon">
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Program</span>
     </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Program</DialogTitle>
          <DialogDescription>Update the details for the program: {program.name}.</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {/* Pass current program data and form state to the edit form */}
          <ProgramEditForm state={state} program={program} />
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 