import type { ElementType } from 'react';
import { AnimatedHeading } from './AnimatedHeading';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  headingAs?: ElementType;
  align?: 'left' | 'center';
}

export const SectionHeader = ({ eyebrow, title, lead, headingAs = 'h2', align = 'left' }: SectionHeaderProps) => (
  <div className={`section-header section-header--${align}`}>
    {eyebrow ? (
      <span className="section-eyebrow" data-reveal data-reveal-early>
        {eyebrow}
      </span>
    ) : null}
    <AnimatedHeading as={headingAs} text={title} className="heading section-header__title" />
    {lead ? (
      <p className="section-lead" data-reveal data-reveal-delay="1">
        {lead}
      </p>
    ) : null}
  </div>
);
