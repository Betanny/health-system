'use client'

import React, { useState, useEffect, useActionState, useRef } from 'react'
import { useFormStatus, useFormState } from 'react-dom'
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { deleteProgramAction } from "@/lib/actions/program.actions"
import type { Program } from "@/lib/types"
import { Trash2 } from 'lucide-react'

// Define the initial state for the delete action
const initialState = {
  success: false,
  errors: null,
  message: null,
};

// Submit button for the hidden form inside the dialog
function DeleteFormSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending} className="bg-destructive w-full rounded-full text-destructive-foreground hover:bg-destructive/90">
      {pending ? "Deleting..." : "Delete"}
    </AlertDialogAction>
  );
}

interface ProgramDeleteButtonProps {
  program: Program;
  // Optional: Customize trigger appearance
  trigger?: React.ReactNode; 
}

export function ProgramDeleteButton({ program, trigger }: ProgramDeleteButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // Even for delete, useActionState can handle pending/success/error states
  const [state, formAction] = useActionState(deleteProgramAction, initialState);
  const formRef = useRef<HTMLFormElement>(null); // Ref to reset form if needed

  useEffect(() => {
    if (state.success === true) {
      toast({ title: "Success", description: state.message || "Program deleted successfully!" });
      setOpen(false); // Close dialog on success
      // Revalidation is handled by the action
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
      // Keep dialog open on error
    }
  }, [state, toast]);

  // Default trigger button if none provided
   const defaultTrigger = (
     <Button variant="ghost" size="icon" className="rounded-full">
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">Delete Program</span>
     </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
         {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[500px] !rounded-2xl w-[90vw] md:w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the program 
            <span className="font-semibold"> "{program.name}"</span>.
            {/* TODO: Add warning about enrollments if applicable */}
            {/* Any existing enrollments in this program may also be affected or deleted depending on database setup. */} 
          </AlertDialogDescription>
        </AlertDialogHeader>
         {/* Display general form errors from the action */}
         {state.errors?._form && (
             <p className="text-sm font-medium text-destructive py-2 px-6">{state.errors._form[0]}</p>
          )}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
           {/* Use a form to trigger the server action */}
          <form action={formAction} ref={formRef}>
             <input type="hidden" name="id" value={program.id} />
             <DeleteFormSubmitButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 