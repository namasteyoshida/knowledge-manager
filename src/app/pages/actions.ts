"use server";

import {prisma} from "@/lib/prisma";

export async function createPage(title: string, content: string, authorId: string) {
    if (!title || !content || !authorId) {
        throw new Error("タイトル、本文、著者は必須です。");
    }

    const page = await prisma.page.create({
        data: {
            title,
            revisions: {
                create: {
                    content,
                    authorId,
                },
            },
        },
    });

    return page;
}