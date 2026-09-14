import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const request = await prisma.generationRequest.findUnique({
    where: { id },
  });

  if (!request) {
    return NextResponse.json({ error: "リクエストが見つかりません" }, { status: 404 });
  }

  return NextResponse.json({
    status: request.status,
    resultUrl: request.resultUrl,
    errorMessage: request.errorMessage,
  });
}