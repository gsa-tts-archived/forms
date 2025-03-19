import classNames from 'classnames';
import React from 'react';
import styles from './pageMenuStyles.module.css';

export type PageMenuProps = {
  pages: {
    selected: boolean;
    title: string;
    url: string;
    active: boolean;
  }[];
  pageWindow: {
    selected: boolean;
    title: string;
    url?: string;
    active: boolean;
  }[];
};

export const PageMenu = ({ pages, pageWindow }: PageMenuProps) => {
  return (
    <div className={`${styles.sideNavWrapper} position-sticky`}>
      <ul className={`${styles.sideNav} usa-sidenav`}>
        <li className="usa-sidenav__item">
          <select
            className="usa-select margin-bottom-3"
            defaultValue={pages.filter(page => page.selected)[0].url}
            onChange={event => {
              const url = event.target.value;
              if (url) {
                window.location.assign(url);
              }
            }}
          >
            <option value="">- Select page -</option>
            {pages.map((page, index) => (
              <option key={index} value={page.url}>
                {page.title}
              </option>
            ))}
          </select>
        </li>
        {pageWindow.map((page, index) => (
          <li
            key={index}
            className={classNames('usa-sidenav__item', styles.sideNav, {
              'usa-current text-primary': page.selected,
            })}
          >
            <a className={classNames(styles.usaNavLink)} href={page.url}>
              <span
                className={classNames({
                  'text-disabled-lighter': !page.active,
                })}
              >
                {page.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
