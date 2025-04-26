import { NextResponse } from "next/server";
import {
    getAllEnrollmentsApi,
    createEnrollmentApi,
} from "@/lib/actions/enrollment.actions";

// GET /api/enrollments - Fetch all enrollments (Protected by middleware)
export async function GET(request: Request) {
    try {
        // Middleware already verified authentication
        const enrollments = await getAllEnrollmentsApi();
        return NextResponse.json(enrollments);

    } catch (error) {
        console.error("[API_ENROLLMENTS_GET] Error fetching enrollments:", error);
        return NextResponse.json({ message: "Failed to fetch enrollments due to an internal error." }, { status: 500 });
    }
}

// POST /api/enrollments - Create a new enrollment (Protected by middleware)
export async function POST(request: Request) {
    try {
        // Middleware already verified authentication
        const body = await request.json();

        // createEnrollmentApi handles validation
        const newEnrollment = await createEnrollmentApi(body); 

        // Return the newly created enrollment (with details)
        return NextResponse.json(newEnrollment, { status: 201 }); 

    } catch (error: any) {
        console.error("[API_ENROLLMENTS_POST] Error creating enrollment:", error);

        // Handle specific errors from createEnrollmentApi
        if (error.message.startsWith("Validation failed")) {
             try {
                const errors = JSON.parse(error.message.substring("Validation failed: ".length));
                return NextResponse.json({ message: "Validation failed", errors }, { status: 400 });
            } catch { 
                 return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
            }
        } else if (error.message === "Client is already enrolled in this program.") {
            return NextResponse.json({ message: error.message }, { status: 409 }); // Conflict
        } else if (error.message === "Invalid Client or Program ID provided.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ message: "Failed to create enrollment due to an internal error." }, { status: 500 });
    }
} 