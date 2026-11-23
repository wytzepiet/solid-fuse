import type { ReactNode } from 'react';
import { IdeaSwitcher } from '@/components/ideas/switcher';
import './ideas.css';

export const metadata = { title: 'Home page ideas' };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <IdeaSwitcher />
    </>
  );
}
