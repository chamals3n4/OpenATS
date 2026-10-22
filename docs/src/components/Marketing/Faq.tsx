import {useState, type ReactNode} from 'react';
import {HugeiconsIcon} from '@hugeicons/react';
import {Add01Icon} from '@hugeicons/core-free-icons';
import styles from './marketing.module.css';

/** Questions in cards that open smoothly, one at a time. The first starts open. */
export default function Faq({items}: {items: [string, string][]}): ReactNode {
  const [open, setOpen] = useState(0);
  return (
    <div className={styles.faq}>
      {items.map(([q, a], i) => {
        const isOpen = open === i;
        return (
          <div key={q} className={isOpen ? styles.faqItemOpen : styles.faqItem}>
            <button type="button" className={styles.faqQ} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>
              {q}
              <HugeiconsIcon icon={Add01Icon} className={styles.faqIcon} strokeWidth={2} aria-hidden="true" />
            </button>
            {/* The grid row animates from 0 to the answer's height */}
            <div className={styles.faqA} aria-hidden={!isOpen}>
              <div>
                <p>{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
