// Define a type for the state returned by actions used with useFormState
export type FormState = {
  success: boolean;
  message: string | null;
  errors?: Record<string, string[] | undefined> | null; // Allow specific field errors (string[]) or general form error (_form)
}; 