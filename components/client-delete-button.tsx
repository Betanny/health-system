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
import { deleteClientAction } from "@/lib/actions/client.actions"
import type { Client } from "@/lib/types"
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const initialState = {
  success: false,
  errors: null,
  message: null,
};

function DeleteFormSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full w-full">
      {pending ? "Deleting..." : "Delete Client"}
    </AlertDialogAction>
  );
}

interface ClientDeleteButtonProps {
  client: Client;
  trigger?: React.ReactNode;
  onSuccess: () => Promise<void>;
}

export function ClientDeleteButton({ client, trigger, onSuccess }: ClientDeleteButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction] = useActionState(deleteClientAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleSuccess = async () => {
      toast({ title: "Success", description: state.message || "Client deleted successfully!" });
      setOpen(false);
      router.refresh();
      await onSuccess();
    };

    if (state.success === true) {
      handleSuccess();
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, onSuccess, router]);

  const defaultTrigger = (
     <Button variant="ghost" size="icon" className="rounded-full bg-red-50 dark:bg-[#212121]">
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">Delete Client</span>
     </Button>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
         {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent className="!rounded-2xl w-[90vw] md:w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the client 
            <span className="font-semibold"> {client.firstName} {client.lastName} </span> 
            and all associated enrollments.
          </AlertDialogDescription>
        </AlertDialogHeader>
         {state.errors?._form && (
             <p className="text-sm font-medium text-destructive py-2 px-6">{state.errors._form[0]}</p>
          )}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
          <form action={formAction} ref={formRef}>
             <input type="hidden" name="id" value={client.id} />
             <DeleteFormSubmitButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 