import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { disconnectUserSockets } from "@/lib/socket-server";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().pipe(z.string().email()).optional(),
  password: z.string().min(8).max(100).optional(),
  planId: z.string().min(1).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isSuspended: z.boolean().optional(),
  planExpiresAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { password, planExpiresAt, email, role, isSuspended, ...rest } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Don't let an admin lock themselves out of the admin panel.
  if (target.id === auth.user.id && (role === "USER" || isSuspended === true)) {
    return NextResponse.json({ error: "You can't remove your own admin access" }, { status: 400 });
  }

  if (email && email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) return NextResponse.json({ error: "Another account already uses that email" }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...rest,
      ...(email ? { email } : {}),
      ...(role ? { role } : {}),
      ...(isSuspended !== undefined ? { isSuspended } : {}),
      ...(password ? { password: await hashPassword(password) } : {}),
      // A new password or a suspension revokes every token issued before it.
      ...(password || isSuspended === true ? { tokenVersion: { increment: 1 } } : {}),
      ...(planExpiresAt !== undefined ? { planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null } : {}),
    },
    include: {
      plan: { select: { id: true, name: true, slug: true, priceINR: true } },
      _count: { select: { chatbots: true } },
    },
  });

  // REST routes recheck on every request; open dashboard sockets have to be
  // cut explicitly or they'd keep receiving live events.
  if (password || isSuspended === true) disconnectUserSockets(user.id);

  const { password: _pw, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  disconnectUserSockets(id);
  return new NextResponse(null, { status: 204 });
}
