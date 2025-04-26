import { NextResponse } from "next/server"
import { z } from "zod"
import {
    getClientWithEnrollments, 
    updateClientApi,
    deleteClientApi,
} from "@/lib/actions/client.actions"

interface RouteParams {
    params: { id: string }
}

const uuidSchema = z.string().uuid({ message: "Invalid client ID format." })

// API handler to get client profile by ID, including enrollments
export async function GET(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const clientId = params.id
        
        // Validate UUID from path
        const validation = uuidSchema.safeParse(clientId)
        if (!validation.success) {
             return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 })
        }

        const client = await getClientWithEnrollments(clientId)

        if (!client) {
            return NextResponse.json({ message: "Client not found" }, { status: 404 })
        }

        return NextResponse.json(client)

    } catch (error) {
        console.error(`[API_CLIENTS_GET_ID] Error fetching client ${params.id}:`, error)
        return NextResponse.json({ message: "Failed to fetch client due to an internal error." }, { status: 500 })
    }
}

// PUT /api/clients/{id} - Update a specific client (Protected by middleware)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const clientId = params.id
        
        // Validate UUID from path
        const idValidation = uuidSchema.safeParse(clientId)
        if (!idValidation.success) {
             return NextResponse.json({ message: idValidation.error.errors[0].message }, { status: 400 })
        }
        
        const body = await request.json()

        // updateClientApi handles body validation and update logic
        const updatedClient = await updateClientApi(clientId, body)
        
        return NextResponse.json(updatedClient)

    } catch (error: any) {
        console.error(`[API_CLIENTS_PUT_ID] Error updating client ${params.id}:`, error)

        // Handle specific errors thrown by updateClientApi
        if (error.message.startsWith("Validation failed")) {
            try {
                const errors = JSON.parse(error.message.substring("Validation failed: ".length))
                return NextResponse.json({ message: "Validation failed", errors }, { status: 400 })
            } catch { 
                 return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
            }
        } else if (error.message === "Email address already exists.") {
            return NextResponse.json({ message: error.message, errors: { email: [error.message]} }, { status: 409 })
        } else if (error.message === "Client not found or update failed.") {
             return NextResponse.json({ message: "Client not found" }, { status: 404 })
        } else if (error.message === "Invalid client ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 })
        } else if (error.message === "No valid fields provided for update.") {
             return NextResponse.json({ message: error.message }, { status: 400 })
        } else if (error.message.includes("encryption")) {
             return NextResponse.json({ message: "Internal server error during data processing." }, { status: 500 })
        }
        
        return NextResponse.json({ message: "Failed to update client due to an internal error." }, { status: 500 })
    }
}

// DELETE /api/clients/{id} - Delete a specific client (Protected by middleware)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const clientId = params.id
        
        // deleteClientApi handles validation and deletion
        await deleteClientApi(clientId)
        
        // Return 204 No Content on successful deletion
        return new NextResponse(null, { status: 204 }) 

    } catch (error: any) {
        console.error(`[API_CLIENTS_DELETE_ID] Error deleting client ${params.id}:`, error)

        // Handle specific errors from deleteClientApi
        if (error.message === "Client not found.") {
            return NextResponse.json({ message: "Client not found" }, { status: 404 })
        } else if (error.message === "Invalid client ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 })
        }
        
        return NextResponse.json({ message: "Failed to delete client due to an internal error." }, { status: 500 })
    }
}
