import type {ReactNode} from 'react';
import {useThemeConfig, ErrorCauseBoundary} from '@docusaurus/theme-common';
import {splitNavbarItems, useNavbarMobileSidebar} from '@docusaurus/theme-common/internal';
import NavbarItem, {type Props as NavbarItemConfig} from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import styles from './styles.module.css';

function NavbarItems({items}: {items: NavbarItemConfig[]}): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error: Error) =>
            new Error(`A theme navbar item failed to render:\n${JSON.stringify(item, null, 2)}`, {cause: error})
          }
        >
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

/** Logo on the left, the page links grouped in the middle, GitHub and the theme switch on the right. */
export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();
  const items = useThemeConfig().navbar.items as NavbarItemConfig[];
  const [leftItems, rightItems] = splitNavbarItems(items);

  return (
    <div className={`navbar__inner ${styles.inner}`}>
      <div className={`navbar__items ${styles.brand}`}>
        {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
        <NavbarLogo />
      </div>
      <nav className={styles.links} aria-label="Main">
        <NavbarItems items={leftItems} />
      </nav>
      <div className={`navbar__items navbar__items--right ${styles.right}`}>
        <NavbarItems items={rightItems} />
        <NavbarColorModeToggle className={styles.toggle} />
      </div>
    </div>
  );
}
