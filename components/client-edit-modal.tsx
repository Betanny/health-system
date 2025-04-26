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
import { updateClientAction } from "@/lib/actions/client.actions"
import { ClientEditForm } from "./client-edit-form"
import type { Client } from "@/lib/types"
import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'

const initialState = {
  success: false,
  errors: null,
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="rounded-full" disabled={pending}>
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

interface ClientEditModalProps {
  client: Client; // Client data to edit
  trigger?: React.ReactNode;
  onSuccess: () => Promise<void>; // Add the onSuccess prop type
}

export function ClientEditModal({ client, trigger, onSuccess }: ClientEditModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const router = useRouter(); // Get router instance
  const [state, formAction] = useActionState(updateClientAction, initialState);

  useEffect(() => {
    const handleSuccess = async () => {
      toast({ title: "Success", description: state.message || "Client updated successfully!" });
      setOpen(false);
      router.refresh(); // Refresh the route
      await onSuccess(); // Call the callback
    };

    if (state.success === true) {
      handleSuccess();
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onSuccess, router]); // Add dependencies

  const defaultTrigger = (
     <Button variant="ghost" size="icon" className="rounded-full bg-gray-100 dark:bg-[#212121]">
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit Client</span>
     </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] !rounded-2xl mx-2">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>Update details for {client.firstName} {client.lastName}.</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <ClientEditForm state={state} client={client} />
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