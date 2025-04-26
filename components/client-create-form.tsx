'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Define the expected shape of the state prop (matching FormState from actions)
type ClientFormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[] | undefined> | null;
};

interface ClientCreateFormProps {
  state: ClientFormState;
}

// This component only contains the form fields and labels.
// It receives the form state from its parent (the modal) to display errors.
export function ClientCreateForm({ state }: ClientCreateFormProps) {
  return (
    <div className="space-y-4 py-4">
        {/* Display general form errors if they exist outside specific fields */}
        {state.errors?._form && (
            <p className="text-sm font-medium text-destructive">{state.errors._form[0]}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" name="firstName" required aria-describedby={state.errors?.firstName ? "firstName-error" : undefined} />
                {state.errors?.firstName && (
                    <p id="firstName-error" className="text-sm font-medium text-destructive">{state.errors.firstName[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" name="lastName" required aria-describedby={state.errors?.lastName ? "lastName-error" : undefined} />
                {state.errors?.lastName && (
                    <p id="lastName-error" className="text-sm font-medium text-destructive">{state.errors.lastName[0]}</p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" required aria-describedby={state.errors?.dateOfBirth ? "dateOfBirth-error" : undefined} />
                {state.errors?.dateOfBirth && (
                    <p id="dateOfBirth-error" className="text-sm font-medium text-destructive">{state.errors.dateOfBirth[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select name="gender" required defaultValue="" aria-describedby={state.errors?.gender ? "gender-error" : undefined}> 
                    <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                </Select>
                {state.errors?.gender && (
                    <p id="gender-error" className="text-sm font-medium text-destructive">{state.errors.gender[0]}</p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label> 
                <Input id="contactNumber" name="contactNumber" required aria-describedby={state.errors?.contactNumber ? "contactNumber-error" : undefined} /> 
                {state.errors?.contactNumber && (
                    <p id="contactNumber-error" className="text-sm font-medium text-destructive">{state.errors.contactNumber[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required aria-describedby={state.errors?.email ? "email-error" : undefined} />
                {state.errors?.email && (
                    <p id="email-error" className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>
                )}
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" aria-describedby={state.errors?.address ? "address-error" : undefined} />
            {state.errors?.address && (
                <p id="address-error" className="text-sm font-medium text-destructive">{state.errors.address[0]}</p>
            )}
        </div>
    </div>
  );
} 