import Image from "next/image";

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
}

export function Avatar({ name, url, size = 32 }: AvatarProps) {
  if (url)
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "#e63c23",
      }}
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0"
    >
      {initials}
    </div>
  );
}
