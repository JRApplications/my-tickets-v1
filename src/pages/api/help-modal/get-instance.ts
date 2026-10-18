import type { APIRoute } from 'astro';
import { appInstances } from '@wix/app-management';

export const GET: APIRoute = async ({ request }) => {
  try {
    const instance = await appInstances.getAppInstance();
    return new Response(JSON.stringify({ success: true, instance }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        },
    });
  } catch (error) {
    console.error('Error fetching app instance:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
        status: 500,
        headers: {
            'Content-Type': 'application/json',
        },
    });
  }
};