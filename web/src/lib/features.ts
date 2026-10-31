/**
 * Videos need Cloudflare Stream and R2, which are paid. Until the build variable VITE_VIDEOS is "on",
 * nobody sees a Videos tab and the app never asks for videos (DEPLOY.md, "Videos").
 */
export const videosOn = import.meta.env.VITE_VIDEOS === "on";
