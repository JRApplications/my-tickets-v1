/**
 * The embedded chat keeps its compiled styles in chat-component.html. CSS
 * Modules therefore use their source class names directly instead of
 * importing a stylesheet that Vite would emit as a separate CSS asset.
 */
export const styles: Record<string, string> = new Proxy(
  {},
  {
    get: (_target, className) =>
      typeof className === 'string' ? className : undefined,
  },
);
