import type { MDXComponents } from "mdx/types";

// Required by @next/mdx in the App Router so MDX pages render as server components.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
