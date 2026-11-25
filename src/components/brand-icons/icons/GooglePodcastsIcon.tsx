import type { SVGProps } from "react";

export function GooglePodcastsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {props.children}
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3v2M12 19v2M12 8v8M8 17v2M4 11v2M20 11v2M8 5v8M16 7v-2M16 19v-8" />
    </svg>
  );
}
