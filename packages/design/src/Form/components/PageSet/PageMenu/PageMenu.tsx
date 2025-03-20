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
                  'text-primary': page.active,
                })}
              >
                {page.title}
              </span>
            </a>
            {/*
            <ul className="usa-sidenav__sublist">
              <li className="usa-sidenav__item">
                <a href="javascript:void(0);">Child link</a>
              </li>
              <li className="usa-sidenav__item">
                <a href="javascript:void(0);">Child link</a>
              </li>
              <li className="usa-sidenav__item">
                <a href="javascript:void(0);" className="usa-current">
                  Child link
                </a>
              </li>
            </ul>
            */}
          </li>
        ))}
      </ul>
    </div>
  );
};
