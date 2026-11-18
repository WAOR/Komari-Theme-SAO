import { Link, type LinkProps } from "react-router-dom";

type HomeInstanceLinkProps = Omit<LinkProps, "to" | "state"> & { uuid: string };

export function HomeInstanceLink({ uuid, ...props }: HomeInstanceLinkProps) {
  return (
    <Link
      {...props}
      to={`/instance/${encodeURIComponent(uuid)}`}
      state={{ homeHistorySteps: 1 }}
    />
  );
}
