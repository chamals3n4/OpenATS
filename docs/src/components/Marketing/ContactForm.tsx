import {useState, type ChangeEvent, type FormEvent, type ReactNode} from 'react';
import {CONTACT_EMAIL, mailto} from './offer';
import styles from './marketing.module.css';

type Fields = {name: string; email: string; company: string; message: string};

/**
 * A contact form with no backend: the send button opens the visitor's email
 * app with every field filled in, so nothing is sent until they press send.
 */
export default function ContactForm({button = 'Send message'}: {button?: string}): ReactNode {
  const [fields, setFields] = useState<Fields>({name: '', email: '', company: '', message: ''});
  const [opened, setOpened] = useState(false);

  const update = (key: keyof Fields) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((current) => ({...current, [key]: event.target.value}));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      ...(fields.company ? [`Company: ${fields.company}`] : []),
      '',
      fields.message,
    ].join('\n');
    window.location.href = mailto(`OpenATS: ${fields.company || fields.name}`, body);
    setOpened(true);
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>Name</span>
          <input required name="name" autoComplete="name" value={fields.name} onChange={update('name')} />
        </label>
        <label className={styles.field}>
          <span>Work email</span>
          <input required type="email" name="email" autoComplete="email" value={fields.email} onChange={update('email')} />
        </label>
      </div>
      <label className={styles.field}>
        <span>Company (optional)</span>
        <input name="company" autoComplete="organization" value={fields.company} onChange={update('company')} />
      </label>
      <label className={styles.field}>
        <span>Message</span>
        <textarea
          required
          name="message"
          className={styles.textarea}
          value={fields.message}
          onChange={update('message')}
        />
      </label>
      <div className={styles.formFoot}>
        <button className={styles.primary} type="submit">
          {button}
        </button>
        <p className={styles.formNote}>
          {opened ? (
            <>
              Your email app should be open. If not, write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </>
          ) : (
            'Opens your email app with this filled in. Nothing is sent until you press send.'
          )}
        </p>
      </div>
    </form>
  );
}
