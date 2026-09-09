import React, {useEffect, useState} from 'react';
import MDXComponents from '@theme-original/MDXComponents';

type ImageProps = React.ComponentProps<'img'>;

function ImageLightbox({alt = '', ...props}: ImageProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setClosing(true);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="docs-image-trigger"
        onClick={() => {
          setClosing(false);
          setOpen(true);
        }}
        aria-label={`Open image: ${alt || 'documentation image'}`}
      >
        <img {...props} alt={alt} />
      </button>
      {open && (
        <div
          className={`docs-image-lightbox${closing ? ' is-closing' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Expanded documentation image'}
          onClick={() => setClosing(true)}
          onAnimationEnd={(event) => {
            if (event.animationName === 'docs-image-fade-out') {
              setOpen(false);
              setClosing(false);
            }
          }}
        >
          <button
            type="button"
            className="docs-image-close"
            onClick={() => setClosing(true)}
            aria-label="Close image"
          >
            ×
          </button>
          <img
            {...props}
            alt={alt}
            className="docs-image-expanded"
          />
        </div>
      )}
    </>
  );
}

export default {
  ...MDXComponents,
  img: ImageLightbox,
};
