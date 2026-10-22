import {useState, type ReactNode} from 'react';
import {HugeiconsIcon, type IconSvgElement} from '@hugeicons/react';
import {
  BriefcaseBusinessIcon,
  CoPresentIcon,
  Quiz03Icon,
  TelegramIcon,
  UserAdd01Icon,
  UsersRoundIcon,
} from '@hugeicons/core-free-icons';
import {ScaledFrame} from './runtime';
import ApplyScreen from './screens/ApplyScreen';
import AssessmentScreen from './screens/AssessmentScreen';
import CandidateScreen from './screens/CandidateScreen';
import InterviewScreen from './screens/InterviewScreen';
import OfferScreen from './screens/OfferScreen';
import PipelineScreen from './screens/PipelineScreen';
import './app.css';
import styles from './tour.module.css';

type Tab = {
  id: string;
  label: string;
  icon: IconSvgElement;
  url: string;
  caption: string;
  Screen: (props: {onDone?: () => void}) => ReactNode;
};

// One hire, from applying to accepting the offer. Icons as in the app's sidebar.
const TABS: Tab[] = [
  {id: 'apply', label: 'Apply', icon: UserAdd01Icon, url: 'careers.acme.com/careers/12', caption: 'A candidate finds the role on your careers page and applies.', Screen: ApplyScreen},
  {id: 'pipeline', label: 'Pipeline', icon: BriefcaseBusinessIcon, url: 'hire.acme.com/jobs/12/pipeline', caption: 'The application lands on the board. Drag it on, and the assessment goes out by itself.', Screen: PipelineScreen},
  {id: 'candidate', label: 'Candidate', icon: UsersRoundIcon, url: 'hire.acme.com/candidates/48', caption: 'Every score and step in one place. Rate the CV and the score updates.', Screen: CandidateScreen},
  {id: 'assessment', label: 'Assessment', icon: Quiz03Icon, url: 'hire.acme.com/assessment/7f3c…', caption: 'The candidate takes the test against a clock the server keeps.', Screen: AssessmentScreen},
  {id: 'interview', label: 'Interview', icon: CoPresentIcon, url: 'hire.acme.com/interview/b81e…', caption: 'They pick their own interview slot. The interviewer gets the calendar entry.', Screen: InterviewScreen},
  {id: 'offer', label: 'Offer', icon: TelegramIcon, url: 'hire.acme.com/offer/c42a…', caption: 'The offer letter arrives by email and is accepted online.', Screen: OfferScreen},
];

/** A clickable tour of the app. It plays the whole hire in order until a tab is chosen. */
export default function ProductTour(): ReactNode {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const tab = TABS[index]!;

  return (
    <div className={styles.tour}>
      <div className={styles.tabs} role="tablist" aria-label="Product tour">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={i === index ? styles.tabActive : styles.tab}
            onClick={() => {
              setIndex(i);
              setAutoplay(false);
            }}
          >
            <HugeiconsIcon icon={t.icon} className={styles.tabIcon} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>
      <p className={styles.caption}>{tab.caption}</p>

      <div className={styles.window} role="tabpanel" aria-label={tab.label}>
        <div className={styles.bar} aria-hidden="true">
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.url}>{tab.url}</span>
        </div>
        <ScaledFrame>
          {/* Keyed so each screen starts from the beginning */}
          <tab.Screen key={tab.id} onDone={autoplay ? () => setIndex((i) => (i + 1) % TABS.length) : undefined} />
        </ScaledFrame>
      </div>
    </div>
  );
}
