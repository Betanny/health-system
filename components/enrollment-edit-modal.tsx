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
import { updateEnrollmentAction } from "@/lib/actions/enrollment.actions"
import { EnrollmentEditForm } from "./enrollment-edit-form" 
import type { Enrollment } from "@/lib/types"
import { Pencil } from 'lucide-react'

const initialState = {
  success: false,
  errors: null,
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="rounded-full">
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

interface EnrollmentEditModalProps {
  // Pass only the necessary fields for the form
  enrollment: Pick<Enrollment, 'id' | 'enrollmentDate' | 'status' | 'notes'> & { programName: string }; 
  trigger?: React.ReactNode;
}

export function EnrollmentEditModal({ enrollment, trigger }: EnrollmentEditModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateEnrollmentAction, initialState);

  useEffect(() => {
    if (state.success === true) {
      toast({ title: "Success", description: state.message || "Enrollment updated successfully!" });
      setOpen(false);
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast]);

  const defaultTrigger = (
     <Button variant="ghost" size="icon">
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Enrollment</span>
     </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] !rounded-2xl w-[90vw] md:w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Enrollment</DialogTitle>
          <DialogDescription>Update details for the enrollment in "{enrollment.programName}".</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <EnrollmentEditForm state={state} enrollment={enrollment} />
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-full">
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