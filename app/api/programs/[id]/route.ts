import { NextResponse } from "next/server";
import { z } from "zod";
import {
    getProgramById, 
    updateProgramApi,
    deleteProgramApi
} from "@/lib/actions/program.actions";

interface RouteParams {
    params: { id: string };
}

const uuidSchema = z.string().uuid({ message: "Invalid program ID format." });

// GET /api/programs/{id} - Fetch a specific program (Protected by middleware)
export async function GET(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const programId = params.id;
        
        // Validate UUID from path
        const validation = uuidSchema.safeParse(programId);
        if (!validation.success) {
             return NextResponse.json({ message: validation.error.errors[0].message }, { status: 400 });
        }

        // Use the existing getProgramById action
        const program = await getProgramById(programId);

        if (!program) {
            return NextResponse.json({ message: "Program not found" }, { status: 404 });
        }

        return NextResponse.json(program);

    } catch (error) {
        console.error(`[API_PROGRAMS_GET_ID] Error fetching program ${params.id}:`, error);
        return NextResponse.json({ message: "Failed to fetch program due to an internal error." }, { status: 500 });
    }
}

// PUT /api/programs/{id} - Update a specific program (Protected by middleware)
export async function PUT(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const programId = params.id;
        const body = await request.json();

        // Validation hint: body should conform to partial ProgramSchema
        const updatedProgram = await updateProgramApi(programId, body);
        
        return NextResponse.json(updatedProgram);

    } catch (error: any) {
        console.error(`[API_PROGRAMS_PUT_ID] Error updating program ${params.id}:`, error);

        // Handle specific errors thrown by updateProgramApi
        if (error.message.startsWith("Validation failed")) {
            try {
                const errors = JSON.parse(error.message.substring("Validation failed: ".length));
                return NextResponse.json({ message: "Validation failed", errors }, { status: 400 });
            } catch { 
                 return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
            }
        } else if (error.message === "Another program with this name already exists.") {
            return NextResponse.json({ message: error.message, errors: { name: [error.message]} }, { status: 409 });
        } else if (error.message === "Program not found or update failed.") {
             return NextResponse.json({ message: "Program not found" }, { status: 404 });
        } else if (error.message === "Invalid program ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        } else if (error.message === "No valid fields provided for update.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        }
        
        return NextResponse.json({ message: "Failed to update program due to an internal error." }, { status: 500 });
    }
}

// DELETE /api/programs/{id} - Delete a specific program (Protected by middleware)
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        // Middleware already verified authentication
        const programId = params.id;
        
        // deleteProgramApi handles validation and deletion
        await deleteProgramApi(programId);
        
        // Return 204 No Content
        return new NextResponse(null, { status: 204 }); 

    } catch (error: any) {
        console.error(`[API_PROGRAMS_DELETE_ID] Error deleting program ${params.id}:`, error);

        // Handle specific errors from deleteProgramApi
        if (error.message === "Program not found.") {
            return NextResponse.json({ message: "Program not found" }, { status: 404 });
        } else if (error.message === "Invalid program ID format.") {
             return NextResponse.json({ message: error.message }, { status: 400 });
        } else if (error.message.includes("associated enrollments")) {
            return NextResponse.json({ message: error.message }, { status: 409 }); // Conflict
        }
        
        return NextResponse.json({ message: "Failed to delete program due to an internal error." }, { status: 500 });
    }
} 