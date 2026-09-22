// adapter-static needs every route prerenderable; this is a client-only SPA
// (the detection page fetches from the backend in onMount, not during SSR).
export const prerender = true;
