import { NextResponse } from "next/server";
import { z } from "zod";
import {
    getEnrollmentsByClientApi 
} from "@/lib/actions/enrollment.actions";

interface RouteParams {
    params: { clientId: string }; // Parameter name from directory structure
}

const uuidSchema = z.string().uuid({ message: "Invalid client ID format." });

// GET /api/clients/{clientId}/enrollments - Fetch enrollments for a specific client (Protected by middleware)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const clientId = params.clientId;
        
        // Validate UUID from path
        const validation = uuidSchema.safeParse(clientId);
        if (!validation.success) {
             return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
        }

        const enrollments = await getEnrollmentsByClientApi(clientId);
        
        // getEnrollmentsByClientApi returns an empty array if client has no enrollments,
        // which is the correct response.
        return NextResponse.json(enrollments);

    } catch (error: any) {
        console.error(`[API_CLIENT_ENROLLMENTS_GET] Error fetching enrollments for client ${params.clientId}:`, error);
        if (error.message === "Invalid client ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        }
        // TO-DO: Check if client exists? getEnrollmentsByClientApi might not throw if client is valid UUID but doesn't exist.
        // Might need an explicit check or rely on empty array return.
        return NextResponse.json({ message: "Failed to fetch enrollments due to an internal error." }, { status: 500 });
    }
} 