"use server";

import { prisma } from "@/lib/prisma";
import { composeTemplateMarkdown } from "@/lib/templateContent";
import { revalidatePath } from "next/cache";

export async function createPage(title: string, content: string, authorId: string) {
  if (!title || !content || !authorId) {
    return { error: "タイトル、本文、著者は必須です。" };
  }
  const page = await prisma.page.create({
    data: {
      title,
      revisions: { create: { content, authorId } },
    },
  });
  revalidatePath("/pages");
  return { page };
}

export async function updatePage(pageId: string, content: string, authorId: string) {
  if (!content || !authorId) {
    return { error: "本文と著者は必須です。" };
  }

  await prisma.$transaction([
    prisma.revision.create({
      data: { pageId, content, authorId },
    }),
    prisma.page.update({
      where: { id: pageId },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/pages/${pageId}`);
  revalidatePath("/pages");
  return { success: true as const };
}

export async function deletePage(pageId: string) {
  await prisma.page.update({
    where: { id: pageId },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/pages");
  revalidatePath(`/pages/${pageId}`);
}

export async function createPageFromTemplate(
  title: string,
  sections: {
    conclusion: string;
    backgroundIssue: string;
    causePoint: string;
    actionSteps: string;
    notesSummary: string;
  },
  authorId: string
) {
  if (!title.trim() || !authorId) {
    return { error: "タイトルと著者は必須です。" };
  }
  const content = composeTemplateMarkdown(sections);
  return createPage(title, content, authorId);
}

import { documentGenerator } from "@/lib/document-generator";

export async function requestGammaGeneration(
  inputText: string,
  userId: string,
  pageId?: string
) {
  if (!inputText.trim() || !userId) {
    return { error: "内容と実行者は必須です。" };
  }

  const request = await prisma.generationRequest.create({
    data: {
      pageId: pageId ?? null,
      userId,
      inputText,
      status: "PENDING",
    },
  });

  // 生成処理は待たずに開始し、リクエストIDだけ先に返す(非同期処理)
  processGeneration(request.id, inputText);

  return { requestId: request.id };
}

// バックグラウンドで実行される生成処理(呼び出し元には結果を待たせない)
async function processGeneration(requestId: string, inputText: string) {
  await prisma.generationRequest.update({
    where: { id: requestId },
    data: { status: "PROCESSING" },
  });

  try {
    const { resultUrl } = await documentGenerator.generate(inputText);
    await prisma.generationRequest.update({
      where: { id: requestId },
      data: { status: "COMPLETED", resultUrl },
    });
  } catch (err) {
    await prisma.generationRequest.update({
      where: { id: requestId },
      data: { status: "FAILED", errorMessage: (err as Error).message },
    });
  }
}