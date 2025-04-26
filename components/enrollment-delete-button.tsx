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
import { deleteEnrollmentAction } from "@/lib/actions/enrollment.actions"
import type { EnrollmentWithDetails } from "@/lib/types" 
import { Trash2 } from 'lucide-react'

const initialState = {
  success: false,
  errors: null,
  message: null,
};

function DeleteFormSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending} className="bg-destructive rounded-full w-full text-destructive-foreground hover:bg-destructive/90">
      {pending ? "Deleting..." : "Delete Enrollment"}
    </AlertDialogAction>
  );
}

interface EnrollmentDeleteButtonProps {
  enrollment: Pick<EnrollmentWithDetails, 'id' | 'program' | 'client'>; // Need ID and names for confirmation
  trigger?: React.ReactNode;
}

export function EnrollmentDeleteButton({ enrollment, trigger }: EnrollmentDeleteButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(deleteEnrollmentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success === true) {
      toast({ title: "Success", description: state.message || "Enrollment deleted successfully!" });
      setOpen(false);
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast]);

  const defaultTrigger = (
     <Button variant="ghost" size="icon" className="rounded-full w-full">
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">Delete Enrollment</span>
     </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
         {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="!rounded-2xl w-[90vw] md:w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the enrollment of 
            <span className="font-semibold"> {enrollment.client.firstName} {enrollment.client.lastName} </span> 
            in the program 
            <span className="font-semibold"> "{enrollment.program.name}"</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
         {state.errors?._form && (
             <p className="text-sm font-medium text-destructive py-2 px-6">{state.errors._form[0]}</p>
          )}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <form action={formAction} ref={formRef}>
             <input type="hidden" name="id" value={enrollment.id} />
             <DeleteFormSubmitButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 