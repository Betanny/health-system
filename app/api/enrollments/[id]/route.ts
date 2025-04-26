import { NextResponse } from "next/server";
import { z } from "zod";
import {
    getEnrollmentByIdApi, 
    updateEnrollmentApi,
    deleteEnrollmentApi,
} from "@/lib/actions/enrollment.actions";

interface RouteParams {
    params: { id: string };
}

const uuidSchema = z.string().uuid({ message: "Invalid enrollment ID format." });

// GET /api/enrollments/{id} - Fetch a specific enrollment (Protected by middleware)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const enrollmentId = params.id;
        
        const validation = uuidSchema.safeParse(enrollmentId);
        if (!validation.success) {
             return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
        }

        const enrollment = await getEnrollmentByIdApi(enrollmentId);

        if (!enrollment) {
            return NextResponse.json({ message: "Enrollment not found" }, { status: 404 });
        }

        return NextResponse.json(enrollment);

    } catch (error: any) {
        console.error(`[API_ENROLLMENTS_GET_ID] Error fetching enrollment ${params.id}:`, error);
        if (error.message === "Invalid enrollment ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        }
        return NextResponse.json({ message: "Failed to fetch enrollment due to an internal error." }, { status: 500 });
    }
}

// PUT /api/enrollments/{id} - Update a specific enrollment (Protected by middleware)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const enrollmentId = params.id;
        const body = await request.json();

        // updateEnrollmentApi handles validation and update
        const updatedEnrollment = await updateEnrollmentApi(enrollmentId, body);
        
        return NextResponse.json(updatedEnrollment);

    } catch (error: any) {
        console.error(`[API_ENROLLMENTS_PUT_ID] Error updating enrollment ${params.id}:`, error);

        // Handle specific errors from updateEnrollmentApi
        if (error.message.startsWith("Validation failed")) {
             try {
                const errors = JSON.parse(error.message.substring("Validation failed: ".length));
                return NextResponse.json({ message: "Validation failed", errors }, { status: 400 });
            } catch { 
                 return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
            }
        } else if (error.message === "Enrollment not found or update failed.") {
             return NextResponse.json({ message: "Enrollment not found" }, { status: 404 });
        } else if (error.message === "Invalid enrollment ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        } else if (error.message === "No valid fields provided for update.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ message: "Failed to update enrollment due to an internal error." }, { status: 500 });
    }
}

// DELETE /api/enrollments/{id} - Delete a specific enrollment (Protected by middleware)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const enrollmentId = params.id;
        
        // deleteEnrollmentApi handles validation and deletion
        await deleteEnrollmentApi(enrollmentId);
        
        // Return 204 No Content
        return new NextResponse(null, { status: 204 }); 

    } catch (error: any) {
        console.error(`[API_ENROLLMENTS_DELETE_ID] Error deleting enrollment ${params.id}:`, error);

        if (error.message === "Enrollment not found.") {
            return NextResponse.json({ message: "Enrollment not found" }, { status: 404 });
        } else if (error.message === "Invalid enrollment ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ message: "Failed to delete enrollment due to an internal error." }, { status: 500 });
    }
} 