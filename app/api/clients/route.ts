import { NextResponse } from "next/server"
import { getAllClients, createClientApi } from "@/lib/actions/client.actions"


// GET /api/clients - Fetch all clients (Protected by middleware)
export async function GET(request: Request) {
  try {
    // Middleware already verified authentication
    const allClients = await getAllClients();
    return NextResponse.json(allClients);

  } catch (error) {
    console.error("[API_CLIENTS_GET] Error fetching clients:", error);
    return NextResponse.json({ message: "Failed to fetch clients due to an internal error." }, { status: 500 });
  }
}

// POST /api/clients - Create a new client (Protected by middleware)
export async function POST(request: Request) {
    try {
        // Middleware already verified authentication
        const body = await request.json();

        // Call the API-specific creation function
        // It handles validation internally now
        const newClient = await createClientApi(body); 

        // Return the newly created client (decrypted by the action)
        return NextResponse.json(newClient, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error("[API_CLIENTS_POST] Error creating client:", error);

        // Handle specific errors thrown by createClientApi
        if (error.message.startsWith("Validation failed")) {
            try {
                // Attempt to parse the validation errors from the message
                const errors = JSON.parse(error.message.substring("Validation failed: ".length));
                return NextResponse.json({ message: "Validation failed", errors }, { status: 400 });
            } catch { 
                // Fallback if parsing fails
                 return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
            }
        } else if (error.message === "Email address already exists.") {
            return NextResponse.json({ message: error.message, errors: { email: [error.message]} }, { status: 409 }); // 409 Conflict
        } else if (error.message.includes("encryption")) {
             return NextResponse.json({ message: "Internal server error during data processing." }, { status: 500 });
        }
        
        // Generic internal server error
        return NextResponse.json({ message: "Failed to create client due to an internal error." }, { status: 500 });
    }
}
