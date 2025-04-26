import { NextResponse } from "next/server"
import { getAllPrograms, createProgramApi } from "@/lib/actions/program.actions"

// GET /api/programs - Fetch all programs (Protected by middleware)
export async function GET(request: Request) { 
  try {
    // Middleware already verified authentication
    const allPrograms = await getAllPrograms();
    return NextResponse.json(allPrograms);

  } catch (error) {
    console.error("[API_PROGRAMS_GET] Error fetching programs:", error);
    return NextResponse.json({ message: "Failed to fetch programs due to an internal error." }, { status: 500 });
  }
}

// POST /api/programs - Create a new program (Protected by middleware)
export async function POST(request: Request) {
    try {
        // Middleware already verified authentication
        const body = await request.json();

        // Validation hint: body should conform to ProgramSchema
        const newProgram = await createProgramApi(body); 

        // Return the newly created program
        return NextResponse.json(newProgram, { status: 201 }); // 201 Created

    } catch (error: any) {
        console.error("[API_PROGRAMS_POST] Error creating program:", error);

        // Handle specific errors thrown by createProgramApi
        if (error.message.startsWith("Validation failed")) {
            try {
                const errors = JSON.parse(error.message.substring("Validation failed: ".length));
                return NextResponse.json({ message: "Validation failed", errors }, { status: 400 });
            } catch { 
                 return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
            }
        } else if (error.message === "A program with this name already exists.") {
            return NextResponse.json({ message: error.message, errors: { name: [error.message]} }, { status: 409 }); // 409 Conflict
        }
        
        return NextResponse.json({ message: "Failed to create program due to an internal error." }, { status: 500 });
    }
}
