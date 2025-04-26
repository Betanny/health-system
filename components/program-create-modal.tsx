'use client'

import React, { useState, useEffect, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
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
import { createProgramAction } from "@/lib/actions/program.actions"
import { ProgramCreateForm } from "./program-create-form"
import { PlusCircle } from 'lucide-react';

// Define the initial state
const initialState = {
  success: false,
  errors: null,
  message: null,
};

// Submit button
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="rounded-full">
      {pending ? "Creating..." : "Create Program"}
    </Button>
  );
}

interface ProgramCreateModalProps {
  triggerText: string;
  showIcon?: boolean; // Optional prop to show the icon
}

export function ProgramCreateModal({ triggerText, showIcon = false }: ProgramCreateModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createProgramAction, initialState);

  useEffect(() => {
    if (!open) {
      // Optional: Reset state if needed on close
    }
  }, [open]);

  // Handle toast notifications and closing the modal
  useEffect(() => {
    if (state.success === true) {
      toast({ title: "Success", description: state.message || "Program created successfully!" });
      setOpen(false); // Close modal on success
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          {showIcon && <PlusCircle className="mr-2 h-4 w-4" />}
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] !rounded-2xl w-[90vw] md:w-[500px]"> 
        <DialogHeader>
          <DialogTitle>Create New Health Program</DialogTitle>
          <DialogDescription>Enter the details for the new program.</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {/* Form fields */} 
          <ProgramCreateForm state={state} />
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