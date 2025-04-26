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
import { createClientAction } from "@/lib/actions/client.actions"
import { ClientCreateForm } from "./client-create-form"
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation'; 

// Define the initial state matching the FormState type from actions.ts
const initialState = {
  success: false,
  errors: null,
  message: null,
};

// Submit button using useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="rounded-full mb-2">
      {pending ? "Registering..." : "Register Client"}
    </Button>
  );
}

interface ClientCreateModalProps {
  // Remove children, add triggerText
  triggerText: string;
  showIcon?: boolean;
  onSuccess: () => Promise<void>; // Add the onSuccess prop type
}

export function ClientCreateModal({ triggerText, showIcon = false, onSuccess }: ClientCreateModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const router = useRouter(); // Get router instance
  // Replace useFormState with useActionState
  const [state, formAction] = useActionState(createClientAction, initialState);

  useEffect(() => {
    if (!open) {
      // Optional: Reset state when dialog closes if needed, 
      // though useActionState might handle this automatically depending on usage.
      // Consider if you want errors to persist briefly after close.
    }
  }, [open]);

  // Handle side effects like toast notifications and closing the modal
  useEffect(() => {
    const handleSuccess = async () => {
      toast({ title: "Success", description: state.message || "Client registered successfully!" });
      setOpen(false); // Close modal on success
      router.refresh(); // Refresh the route
      await onSuccess(); // Call the callback to refetch data in parent
    };

    if (state.success === true) {
      handleSuccess();
    } else if (state.success === false && state.message) {
      // Display error toast (field errors are shown inline in the form)
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
    // Add onSuccess to dependency array if its identity could change, 
    // though useCallback in parent should stabilize it.
  }, [state, toast, onSuccess, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Remove asChild, render Button inside */}
      <DialogTrigger asChild>
        <Button className="rounded-full"> 
          {showIcon && <UserPlus className="mr-2 h-4 w-4" />} 
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] !rounded-2xl"> {/* Adjust width as needed */} 
        <DialogHeader>
          <DialogTitle>Register New Client</DialogTitle>
          <DialogDescription>Enter the client's personal and contact information.</DialogDescription>
        </DialogHeader>
        {/* The form now uses the action from useActionState */}
        <form action={formAction}>
          {/* Render the actual form fields, passing the state for error display */} 
          <ClientCreateForm state={state} />
          <DialogFooter className="mt-4"> {/* Add margin if needed */} 
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