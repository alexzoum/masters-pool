'use client';

import NavBar from './NavBar';

interface NavUser {
  username: string;
  is_admin: boolean;
}

export default function ClientLayout({
  user,
  children,
}: {
  user: NavUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <NavBar user={user} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
