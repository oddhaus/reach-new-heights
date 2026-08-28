import Link from "next/link";

export default function TopBar({ tag }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          Reach New <span className="brand-accent">Heights</span>
        </Link>
        {tag ? <span className="topbar-tag">{tag}</span> : null}
      </div>
    </header>
  );
}
