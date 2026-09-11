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
  await prisma.revision.create({
    data: { pageId, content, authorId },
  });
  await prisma.page.update({
    where: { id: pageId },
    data: { updatedAt: new Date() },
  });
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