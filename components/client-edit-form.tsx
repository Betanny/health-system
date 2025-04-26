'use client'

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Client } from "@/lib/types";

// Define the expected shape of the state prop
type ClientFormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[] | undefined> | null;
};

interface ClientEditFormProps {
  state: ClientFormState;
  client: Client; // Client data to pre-fill
}

// Component for client edit form fields
export function ClientEditForm({ state, client }: ClientEditFormProps) {
  return (
    <div className="space-y-4 py-4">
        {/* Hidden input for the client ID */}
        <input type="hidden" name="id" value={client.id} />

        {state.errors?._form && (
            <p className="text-sm font-medium text-destructive">{state.errors._form[0]}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input 
                   id="edit-firstName" 
                   name="firstName" 
                   required 
                   defaultValue={client.firstName}
                   aria-describedby={state.errors?.firstName ? "edit-firstName-error" : undefined} />
                {state.errors?.firstName && (
                    <p id="edit-firstName-error" className="text-sm font-medium text-destructive">{state.errors.firstName[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input 
                   id="edit-lastName" 
                   name="lastName" 
                   required 
                   defaultValue={client.lastName}
                   aria-describedby={state.errors?.lastName ? "edit-lastName-error" : undefined} />
                {state.errors?.lastName && (
                    <p id="edit-lastName-error" className="text-sm font-medium text-destructive">{state.errors.lastName[0]}</p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="edit-dateOfBirth">Date of Birth *</Label>
                <Input 
                   id="edit-dateOfBirth" 
                   name="dateOfBirth" 
                   type="date" 
                   required 
                   defaultValue={client.dateOfBirth} // Assumes dateOfBirth is in YYYY-MM-DD format
                   aria-describedby={state.errors?.dateOfBirth ? "edit-dateOfBirth-error" : undefined} />
                {state.errors?.dateOfBirth && (
                    <p id="edit-dateOfBirth-error" className="text-sm font-medium text-destructive">{state.errors.dateOfBirth[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender *</Label>
                <Select 
                   name="gender" 
                   required 
                   defaultValue={client.gender}
                   aria-describedby={state.errors?.gender ? "edit-gender-error" : undefined}> 
                    <SelectTrigger id="edit-gender">
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
                    <p id="edit-gender-error" className="text-sm font-medium text-destructive">{state.errors.gender[0]}</p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="edit-contactNumber">Contact Number *</Label> 
                <Input 
                   id="edit-contactNumber" 
                   name="contactNumber" 
                   required 
                   defaultValue={client.contactNumber}
                   aria-describedby={state.errors?.contactNumber ? "edit-contactNumber-error" : undefined} /> 
                {state.errors?.contactNumber && (
                    <p id="edit-contactNumber-error" className="text-sm font-medium text-destructive">{state.errors.contactNumber[0]}</p>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input 
                   id="edit-email" 
                   name="email" 
                   type="email" 
                   required 
                   defaultValue={client.email}
                   aria-describedby={state.errors?.email ? "edit-email-error" : undefined} />
                {state.errors?.email && (
                    <p id="edit-email-error" className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>
                )}
            </div>
        </div>

        <div className="space-y-2">
            <Label htmlFor="edit-address">Address</Label>
            <Textarea 
               id="edit-address" 
               name="address" 
               defaultValue={client.address}
               aria-describedby={state.errors?.address ? "edit-address-error" : undefined} />
            {state.errors?.address && (
                <p id="edit-address-error" className="text-sm font-medium text-destructive">{state.errors.address[0]}</p>
            )}
        </div>
    </div>
  );
} 