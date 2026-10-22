import {useEffect, useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {GithubIcon, StarIcon} from '@hugeicons/core-free-icons';
import styles from './styles.module.css';

const REPO = 'chamals3n4/OpenATS';
const CACHE_KEY = 'openats-github-stars';

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
}

/** Reads the star count from GitHub once per browser session. Shows nothing if GitHub does not answer. */
function useStars(): number | null {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setStars(Number(cached));
        return;
      }
    } catch {
      // Storage can be blocked; fetch instead
    }
    let cancelled = false;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {stargazers_count?: number} | null) => {
        if (cancelled || typeof data?.stargazers_count !== 'number') return;
        setStars(data.stargazers_count);
        try {
          sessionStorage.setItem(CACHE_KEY, String(data.stargazers_count));
        } catch {
          // Not cached, fetched again next time
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return stars;
}

export default function GithubStar({mobile}: {mobile?: boolean}): ReactNode {
  const stars = useStars();
  const href = `https://github.com/${REPO}`;

  if (mobile) {
    return (
      <li className="menu__list-item">
        <a className="menu__link" href={href} target="_blank" rel="noreferrer">
          Star OpenATS on GitHub
        </a>
      </li>
    );
  }

  return (
    <a className={styles.star} href={href} target="_blank" rel="noreferrer" aria-label="Star OpenATS on GitHub">
      <span className={styles.label}>
        <HugeiconsIcon icon={GithubIcon} className={styles.icon} strokeWidth={1.75} aria-hidden="true" />
        <span className={styles.labelText}>Star on GitHub</span>
      </span>
      <span className={styles.count}>
        <HugeiconsIcon icon={StarIcon} className={styles.starIcon} strokeWidth={1.75} aria-hidden="true" />
        {stars !== null && formatStars(stars)}
      </span>
    </a>
  );
}
