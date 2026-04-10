import { NextResponse } from 'next/server';
import { asgardeo } from '@asgardeo/nextjs/server';
import { serverFetch } from '@/lib/auth-action';
import { assignAsgardeoRole } from '@/lib/asgardeo-roles';
import type { User } from '@/types';

async function getToken() {
    const client = await asgardeo();
    const sessionId = await client.getSessionId();
    if (!sessionId) throw new Error('Unauthorized');
    return client.getAccessToken(sessionId);
}

const BASE = process.env.NEXT_PUBLIC_ASGARDEO_BASE_URL;

export async function GET() {
    try {
        const data = await serverFetch<{ data: User[] }>('/users');
        return NextResponse.json(data.data);
    } catch (e: any) {
        const message = e?.message ?? "Failed to fetch users";
        const lower = String(message).toLowerCase();
        const status = lower.includes("not authenticated")
            ? 401
            : lower.includes("invalid") || lower.includes("expired")
                ? 401
                : lower.includes("forbidden")
                    ? 403
                    : 500;
        return NextResponse.json({ error: message }, { status });
    }
}

export async function POST(req: Request) {
    try {
        const token = await getToken();
        const body = await req.json();
        const role = body.role ?? 'interviewer';
        const username = (body.userName ?? body.email ?? "").toString().trim();
        const tempPassword =
            body.password ??
            `OpenATS!${Math.random().toString(36).slice(2, 8)}A1`;

        const scimPayload: Record<string, unknown> = {
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            name: { givenName: body.firstName, familyName: body.lastName },
            userName: username,
            emails: [{ primary: true, value: body.email }],
            password: tempPassword,
        };

        // create user on asgardeo
        const scimRes = await fetch(`${BASE}/scim2/Users`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(scimPayload),
        });

        let warning: string | undefined;
        let scimUserId: string | undefined;

        if (!scimRes.ok) {
            let message = 'Failed to create user in Asgardeo';
            const raw = await scimRes.text();
            try {
                const err = raw ? JSON.parse(raw) : null;
                message = err?.detail ?? err?.message ?? raw ?? message;
            } catch {
                if (raw) message = raw;
            }
            const lower = message.toLowerCase();
            const canFallbackToLocal =
                scimRes.status === 403 &&
                (lower.includes("operation not permitted") || lower.includes("not permitted"));

            if (!canFallbackToLocal) {
                return NextResponse.json(
                    { error: message },
                    { status: scimRes.status }
                );
            }

            // Fallback: keep app user-management usable even if tenant blocks SCIM provisioning.
            scimUserId = `local-${crypto.randomUUID()}`;
            warning = "Asgardeo provisioning is not permitted for this app; created local user only.";
        } else {
            const scimUser = await scimRes.json();
            scimUserId = scimUser.id;
        }

        let roleWarning: string | undefined;
        if (scimUserId && !scimUserId.startsWith("local-")) {
            try {
                await assignAsgardeoRole(token, scimUserId, role);
            } catch (err: any) {
                roleWarning = err?.message ?? "Failed to assign role in Asgardeo";
            }
        }

        // create db record — no waiting for first login ( when user creating through the app)
        await serverFetch<{ data: unknown }>('/users', {
            method: 'POST',
            body: JSON.stringify({
                asgardeoUserId: scimUserId,
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                role,
            }),
        });

        const combinedWarning = [warning, roleWarning].filter(Boolean).join(" ");
        return NextResponse.json(
            combinedWarning ? { success: true, warning: combinedWarning } : { success: true },
            { status: 201 }
        );
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}