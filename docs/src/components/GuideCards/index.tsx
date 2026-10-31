import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type Guide = {
  title: string;
  href: string;
  summary: string;
  who: string;
};

/** A numbered group of guide cards. `start` continues the numbering from the group before. */
export default function GuideCards({guides, start = 1}: {guides: Guide[]; start?: number}): ReactNode {
  return (
    <ol className={styles.grid} start={start}>
      {guides.map((guide, index) => (
        <li key={guide.href} className={styles.item}>
          <Link to={guide.href} className={styles.card}>
            <span className={styles.number}>{start + index}</span>
            <span className={styles.title}>{guide.title}</span>
            <span className={styles.summary}>{guide.summary}</span>
            <span className={styles.who}>{guide.who}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
