import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {HugeiconsIcon} from '@hugeicons/react';
import {MinusSignIcon, Tick02Icon} from '@hugeicons/core-free-icons';
import Faq from '@site/src/components/Marketing/Faq';
import {CLOUD_PRICE, FREE_TIER, mailto} from '@site/src/components/Marketing/offer';
import styles from '@site/src/components/Marketing/marketing.module.css';

type Plan = {
  name: string;
  desc: string;
  price: string;
  period?: string;
  note: string;
  cta: {label: string; href?: string; to?: string; primary?: boolean};
  includes: string[];
  featured?: boolean;
};

// OpenATS Cloud plans. Self-hosted sits outside these plans: it is separate and free.
const PLANS: Plan[] = [
  {
    name: 'Free',
    desc: 'Try OpenATS Cloud on a real opening, without a card.',
    price: '$0',
    period: 'forever',
    note: FREE_TIER.note,
    cta: {label: 'Start free', href: mailto('OpenATS Cloud Free')},
    includes: [`Up to ${FREE_TIER.jobs} active jobs`, 'Every core feature', 'Unlimited users and candidates', 'Hosting and daily backups included'],
  },
  {
    name: 'Pro',
    desc: 'For teams that hire all the time and never want to think about servers.',
    price: CLOUD_PRICE.amount,
    period: CLOUD_PRICE.period,
    note: CLOUD_PRICE.note,
    cta: {label: 'Get started', href: mailto('OpenATS Cloud Pro'), primary: true},
    includes: [
      'Everything in Free',
      'Unlimited active jobs',
      'Email delivery and private CV storage set up',
      'Email support from the OpenATS team',
    ],
    featured: true,
  },
  {
    name: 'Enterprise',
    desc: 'For larger teams with their own requirements.',
    price: 'Custom',
    note: 'Priced for your team, with an agreement that fits your company.',
    cta: {label: 'Talk to us', href: mailto('OpenATS Enterprise')},
    includes: [
      'Everything in Pro',
      'A dedicated instance and your own domain',
      'Help moving your data from another ATS',
      'Priority support and a security review',
    ],
  },
];

// Grouped rows. ✓ means included, — means not included; both are drawn as icons.
const TABLE: {group: string; rows: [string, string, string, string][]}[] = [
  {
    group: 'Limits',
    rows: [
      ['Active jobs', `${FREE_TIER.jobs}`, 'Unlimited', 'Unlimited'],
      ['Users and candidates', 'Unlimited', 'Unlimited', 'Unlimited'],
    ],
  },
  {
    group: 'Hiring',
    rows: [
      ['Pipelines, careers page and CV search', '✓', '✓', '✓'],
      ['Assessments and take-home assignments', '✓', '✓', '✓'],
      ['Interview scheduling, scorecards and offers', '✓', '✓', '✓'],
    ],
  },
  {
    group: 'Hosting and data',
    rows: [
      ['Hosting, updates and nightly backups', '✓', '✓', '✓'],
      ['Email from your own domain', '—', '✓', '✓'],
      ['Dedicated instance', '—', '—', '✓'],
      ['Help moving data from another ATS', '—', '—', '✓'],
    ],
  },
  {
    group: 'Support',
    rows: [['Who helps you', 'Community', 'Email, from the team', 'Priority']],
  },
];

const FAQ: [string, string][] = [
  ['Why is there no per-seat price?', 'Hiring involves many people for a short time. Charging per seat makes teams leave interviewers out, so we charge one flat price.'],
  ['What happens when I hit the 2-job limit on Free?', 'Nothing breaks. Upgrade to Pro and your jobs, candidates and history stay exactly where they are.'],
  ['Can I switch plans later?', 'Yes. Move between Free, Pro and Enterprise at any time. You can also take your data and self-host; we help you move it.'],
  ['How do I pay for Cloud?', 'Email us to start. We send a monthly invoice, and you can cancel whenever you like.'],
];

function Cta({cta}: {cta: Plan['cta']}): ReactNode {
  const cls = cta.primary ? styles.primary : styles.secondary;
  return cta.to ? (
    <Link className={cls} to={cta.to}>
      {cta.label}
    </Link>
  ) : (
    <a className={cls} href={cta.href}>
      {cta.label}
    </a>
  );
}

function Cell({cell}: {cell: string}): ReactNode {
  if (cell === '✓') {
    return (
      <span className={styles.checkBadge} title="Included">
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} aria-label="Included" />
      </span>
    );
  }
  if (cell === '—') {
    return (
      <span className={styles.dashBadge} title="Not included">
        <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} aria-label="Not included" />
      </span>
    );
  }
  return cell;
}

export default function Pricing(): ReactNode {
  return (
    <Layout title="Pricing" description="OpenATS Cloud pricing: a free plan with 2 jobs, or one flat monthly price for unlimited hiring. No per-seat fees.">
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className="container">
            <Heading as="h1" className={styles.title}>
              Pay for hiring, <em>not for headcount.</em>
            </Heading>
            <p className={styles.lede}>
              Start free with two active jobs. Go unlimited for one flat price, every user included. Or run the
              open-source version yourself, separately and free of charge.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#plans">
                See the plans
              </a>
              <Link className={styles.secondary} to="/contact">
                Ask us a question
              </Link>
            </div>
            <p className={styles.heroNote}>
              <b>Every plan has every feature.</b> The only thing that changes is the job limit and the support.
            </p>
          </div>
        </section>

        <section className={styles.section} id="plans">
          <div className="container">
            <div className={styles.plans}>
              {PLANS.map((plan) => (
                <article className={`${styles.plan} ${plan.featured ? styles.planFeatured : ''}`} key={plan.name}>
                  <div className={styles.planTop}>
                    <Heading as="h2" className={styles.planName}>
                      {plan.name}
                    </Heading>
                    {plan.featured && <span className={styles.badge}>Recommended</span>}
                  </div>
                  <p className={styles.planDesc}>{plan.desc}</p>
                  <div className={styles.price}>
                    <b>{plan.price}</b>
                    {plan.period && <span>{plan.period}</span>}
                  </div>
                  <p className={styles.priceNote}>{plan.note}</p>
                  <Cta cta={plan.cta} />
                  <ul className={styles.list}>
                    {plan.includes.map((item) => (
                      <li key={item}>
                        <HugeiconsIcon icon={Tick02Icon} className={styles.check} strokeWidth={2} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.selfHost}>
              <div className={styles.selfHostText}>
                <Heading as="h2">Prefer to run it yourself?</Heading>
                <p>
                  Self-hosted OpenATS is separate from these plans, and free: the whole app, every feature, under the
                  Apache 2.0 licence. You host it, so your data never leaves your servers, and you look after the
                  updates, backups and email yourself.
                </p>
              </div>
              <Link className={styles.secondary} to="/docs/getting-started/make-setup">
                Read the setup guide
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHead}>
              <Heading as="h2">Every plan, side by side</Heading>
              <p>All the hiring features are in every plan. You only pay for more jobs and more help.</p>
            </div>
            <table className={`${styles.table} ${styles.tableAccent}`}>
              <thead>
                <tr>
                  <th />
                  <th>Free</th>
                  <th className={styles.thFeatured}>
                    Pro <span className={styles.thBadge}>Recommended</span>
                  </th>
                  <th>Enterprise</th>
                </tr>
              </thead>
              {TABLE.map(({group, rows}) => (
                <tbody key={group}>
                  <tr className={styles.groupRow}>
                    <th colSpan={4}>{group}</th>
                  </tr>
                  {rows.map(([row, ...cells]) => (
                    <tr key={row}>
                      <th scope="row">{row}</th>
                      {cells.map((cell, i) => (
                        <td key={i} className={i === 1 ? styles.tdFeatured : undefined}>
                          <Cell cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={`${styles.sectionHead} ${styles.sectionHeadCenter}`}>
              <Heading as="h2">Frequently asked questions</Heading>
            </div>
            <Faq items={FAQ} />
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <div className={styles.band}>
              <div>
                <Heading as="h2">Not sure which plan fits?</Heading>
                <p>Tell us about your team and hiring volume, and we will recommend the right plan.</p>
              </div>
              <div className={styles.actions}>
                <Link className={styles.primary} to="/contact">
                  Contact us
                </Link>
                <Link className={styles.secondary} to="/managed-hosting">
                  About OpenATS Cloud
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
