import type { APIRoute } from 'astro';
import { createClient } from '@wix/sdk';
import { captcha } from '@wix/captcha';
import { items } from '@wix/data';
import { auth } from '@wix/essentials';
import { CollectionIds } from '@jrapps/my_tickets_common_types';

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

export const POST: APIRoute = async ({ request }) => {
    try {
        const contentLength = Number(request.headers.get('content-length') || 0);
        if (contentLength > 64_000) return json({ success: false, error: 'Submission is too large' }, 413);

        const body = await request.json() as Record<string, unknown>;
        if (JSON.stringify(body).length > 64_000) return json({ success: false, error: 'Submission is too large' }, 413);
        const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : '';
        if (!captchaToken || captchaToken.length > 4096) return json({ success: false, error: 'Complete the reCAPTCHA check before submitting' }, 400);
        const visitorAuthorization = request.headers.get('authorization');
        if (!visitorAuthorization) return json({ success: false, error: 'Unable to verify the site visitor. Please try again.' }, 401);

        const captchaClient = createClient({
            auth: { getAuthHeaders: () => ({ headers: { Authorization: visitorAuthorization } }) },
            modules: { captcha },
        });
        try {
            const captchaResult = await captchaClient.captcha.authorize(captchaToken);
            if (captchaResult.success !== true) {
                return json({ success: false, error: 'reCAPTCHA verification failed. Please try again.' }, 403);
            }
        } catch (error) {
            const status = (error as { details?: { httpStatus?: number }; status?: number })?.details?.httpStatus
                ?? (error as { status?: number })?.status;
            if (status === 400 || status === 401) {
                return json({ success: false, error: 'reCAPTCHA verification failed. Please try again.' }, 403);
            }
            console.error('Wix CAPTCHA authorization failed', error);
            return json({ success: false, error: 'reCAPTCHA verification is temporarily unavailable' }, 503);
        }

        const values = body.values;
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
            return json({ success: false, error: 'Invalid form values' }, 400);
        }

        const safeValues: Record<string, string | number | boolean | string[]> = {};
        for (const [key, value] of Object.entries(values as Record<string, unknown>).slice(0, 50)) {
            if (!/^[\w-]{1,100}$/.test(key)) continue;
            if (typeof value === 'string') safeValues[key] = value.slice(0, 5000);
            else if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) safeValues[key] = value;
            else if (Array.isArray(value) && value.length <= 50 && value.every((entry) => typeof entry === 'string')) {
                safeValues[key] = value.map((entry) => entry.slice(0, 500));
            }
        }

        const inputFields = Array.isArray(body.fields) ? body.fields.slice(0, 50) : [];
        const fields = inputFields.map((field: any) => ({
            id: typeof field?.id === 'string' ? field.id.slice(0, 100) : '',
            label: typeof field?.label === 'string' ? field.label.slice(0, 200) : '',
            type: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox'].includes(field?.type) ? field.type : undefined,
            options: Array.isArray(field?.options) ? field.options.slice(0, 100).map((option: any) => ({
                value: typeof option?.value === 'string' ? option.value.slice(0, 500) : '',
                label: typeof option?.label === 'string' ? option.label.slice(0, 200) : '',
            })).filter((option: { value: string; label: string }) => option.value && option.label) : [],
        })).filter((field) => field.id && field.label);
        const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 2000) : '';
        const formTitle = typeof body.formTitle === 'string' ? body.formTitle.slice(0, 200) : 'Offline form';

        await auth.elevate(items.insert)(CollectionIds.OFFLINE_FORM_SUBMISSIONS, {
            formTitle,
            values: safeValues,
            fields,
            pageUrl,
            isSeen: false,
            isResolved: false,
        });
        return json({ success: true });
    } catch (error) {
        console.error('Failed to save offline form submission', error);
        return json({ success: false, error: 'Unable to submit the form' }, 500);
    }
};
