"use client"

import type React from "react"
import { useState, useEffect, useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SelectValue, SelectTrigger, SelectItem, SelectContent, Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createEnrollmentAction } from "@/lib/actions/enrollment.actions"
import { getAllPrograms } from "@/lib/actions/program.actions"
import type { Program } from "@/lib/types"
import { PlusCircle } from "lucide-react"

const initialState = {
  success: false,
  errors: null,
  message: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="rounded-full">
      {pending ? "Enrolling..." : "Enroll Client"}
    </Button>
  );
}

export default function EnrollClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [state, formAction] = useActionState(createEnrollmentAction, initialState);

  useEffect(() => {
    if (open) {
      getAllPrograms()
        .then(setPrograms)
        .catch(err => {
           console.error("Failed to fetch programs for enrollment:", err);
           toast({ title: "Error", description: "Could not load programs.", variant: "destructive" });
        });
    }
  }, [open, toast]);

  useEffect(() => {
    if (state.success === true) {
      toast({ title: "Success", description: state.message || "Enrollment successful!" });
      setOpen(false);
    } else if (state.success === false && state.message) {
      toast({ title: "Error", description: state.message, variant: "destructive" });
    }
  }, [state, toast, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Enroll in Program
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] !rounded-2xl w-[90vw] md:w-[500px]">
        <DialogHeader>
          <DialogTitle>Enroll Client in Program</DialogTitle>
          <DialogDescription>Select a health program to enroll this client in</DialogDescription>
          {state.errors?._form && (
             <p className="text-sm font-medium text-destructive py-2">{state.errors._form[0]}</p>
          )}
        </DialogHeader>
        <form action={formAction} className="space-y-4 py-4">
          <input type="hidden" name="clientId" value={clientId} />

          <div className="space-y-2">
            <Label htmlFor="program">Program *</Label>
            <Select name="programId" required defaultValue="" aria-describedby={state.errors?.programId ? "programId-error" : undefined}>
              <SelectTrigger id="program">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.length === 0 && <p className='p-4 text-sm text-muted-foreground'>Loading programs...</p>}
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.errors?.programId && (
               <p id="programId-error" className="text-sm font-medium text-destructive">{state.errors.programId[0]}</p>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="enrollmentDate">Enrollment Date *</Label>
            <Input
              id="enrollmentDate"
              name="enrollmentDate"
              type="date"
              required
              aria-describedby={state.errors?.enrollmentDate ? "enrollmentDate-error" : undefined}
            />
            {state.errors?.enrollmentDate && (
               <p id="enrollmentDate-error" className="text-sm font-medium text-destructive">{state.errors.enrollmentDate[0]}</p>
             )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select name="status" required defaultValue="active" aria-describedby={state.errors?.status ? "status-error" : undefined}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
             {state.errors?.status && (
               <p id="status-error" className="text-sm font-medium text-destructive">{state.errors.status[0]}</p>
             )}
          </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional information about this enrollment"
              aria-describedby={state.errors?.notes ? "notes-error" : undefined}
            />
             {state.errors?.notes && (
               <p id="notes-error" className="text-sm font-medium text-destructive">{state.errors.notes[0]}</p>
             )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="rounded-full mt-2 md:mt-0">
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
